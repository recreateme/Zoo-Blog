#!/usr/bin/env python3
"""SSH 到 VPS：git pull + docker compose 重建 + /api/sync。

读取项目根目录 .deploy.env（勿提交）。
依赖：pip install paramiko
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

try:
    import paramiko
except ImportError:
    print("[deploy] 请先安装 paramiko: pip install paramiko", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".deploy.env"


def load_env(path: Path) -> dict[str, str]:
    cfg: dict[str, str] = {}
    if not path.exists():
        return cfg
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        cfg[k.strip()] = v.strip().strip('"').strip("'")
    return cfg


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 600) -> tuple[int, str, str]:
    """执行远程命令；按块读取输出，避免长构建时 paramiko PipeTimeout。"""
    print(f"[vps] $ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, get_pty=True)
    channel = stdout.channel
    channel.settimeout(30.0)
    out_chunks: list[str] = []
    err_chunks: list[str] = []
    deadline = time.time() + timeout
    while True:
        if channel.recv_ready():
            chunk = channel.recv(4096).decode("utf-8", errors="replace")
            out_chunks.append(chunk)
            print(chunk, end="", flush=True)
        if channel.recv_stderr_ready():
            chunk = channel.recv_stderr(4096).decode("utf-8", errors="replace")
            err_chunks.append(chunk)
            print(chunk, end="", file=sys.stderr, flush=True)
        if channel.exit_status_ready() and not channel.recv_ready() and not channel.recv_stderr_ready():
            break
        if time.time() > deadline:
            try:
                channel.close()
            except Exception:
                pass
            out = "".join(out_chunks)
            err = "".join(err_chunks) + "\n[timeout]"
            print(err, file=sys.stderr)
            return 124, out, err
        if not channel.recv_ready() and not channel.recv_stderr_ready():
            time.sleep(0.4)
    # drain leftovers
    while channel.recv_ready():
        out_chunks.append(channel.recv(4096).decode("utf-8", errors="replace"))
    while channel.recv_stderr_ready():
        err_chunks.append(channel.recv_stderr(4096).decode("utf-8", errors="replace"))
    code = channel.recv_exit_status()
    return code, "".join(out_chunks), "".join(err_chunks)


def main() -> int:
    cfg = load_env(ENV_FILE)
    host = cfg.get("VPS_HOST") or os.environ.get("VPS_HOST")
    user = cfg.get("VPS_USER") or os.environ.get("VPS_USER", "root")
    password = cfg.get("VPS_PASSWORD") or os.environ.get("VPS_PASSWORD")
    port = int(cfg.get("VPS_PORT") or os.environ.get("VPS_PORT") or "22")
    repo = cfg.get("VPS_REPO_DIR") or os.environ.get("VPS_REPO_DIR", "/var/www/blog/Zoo-Blog")
    compose_args = cfg.get("COMPOSE_ARGS") or os.environ.get("COMPOSE_ARGS", "--profile rag")
    trigger_sync = (cfg.get("TRIGGER_SYNC") or "true").lower() == "true"

    if not host or not password:
        print(
            "[deploy] 缺少 VPS_HOST / VPS_PASSWORD。\n"
            "  请复制 .deploy.env.example 为 .deploy.env 并填写。",
            file=sys.stderr,
        )
        return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"[deploy] 连接 {user}@{host}:{port} …")
    client.connect(host, port=port, username=user, password=password, timeout=30)

    code, _, _ = run(
        client,
        f"set -e; cd {repo} && git fetch origin && git reset --hard origin/main && git log -1 --oneline",
    )
    if code != 0:
        client.close()
        return code

    # 容器内应用以 uid 1001 (nextjs) 运行，git/root 新建的文件会导致
    # 后台「上传笔记 / 上传图片」EACCES，这里统一修正挂载目录属主
    run(
        client,
        f"cd {repo} && mkdir -p content public/uploads public/images"
        " && chown -R 1001:65533 content public/uploads public/images",
    )

    code, _, _ = run(
        client,
        f"set -e; cd {repo} && docker compose {compose_args} up -d --build",
        timeout=1800,
    )
    if code != 0:
        client.close()
        return code

    if trigger_sync:
        # 等待应用就绪
        for _ in range(20):
            c, out, _ = run(client, "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ || true")
            if "200" in out:
                break
            time.sleep(2)

        sync_py = r'''
import re, pathlib, urllib.request
env = pathlib.Path("REPO/.env").read_text(encoding="utf-8", errors="replace")
m = re.search(r"^SYNC_SECRET=(.*)$", env, re.M)
raw = (m.group(1).strip().strip('"\'') if m else "")
req = urllib.request.Request(
    "http://127.0.0.1:3000/api/sync",
    data=b"{}",
    headers={"Content-Type": "application/json", "x-sync-secret": raw},
    method="POST",
)
with urllib.request.urlopen(req, timeout=120) as r:
    print(r.read().decode())
'''.replace("REPO", repo)
        sftp = client.open_sftp()
        with sftp.file("/tmp/_kb_sync.py", "w") as f:
            f.write(sync_py)
        sftp.close()
        code, _, _ = run(client, "python3 /tmp/_kb_sync.py; rm -f /tmp/_kb_sync.py")
        if code != 0:
            print("[deploy] /api/sync 失败，可登录后台手动「从文件系统同步」", file=sys.stderr)

    run(client, "curl -s -o /dev/null -w 'home:%{http_code}\\n' http://127.0.0.1:3000/")
    client.close()
    print("[deploy] 完成")
    return 0


if __name__ == "__main__":
    sys.exit(main())
