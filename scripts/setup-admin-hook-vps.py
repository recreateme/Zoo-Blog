#!/usr/bin/env python3
"""在 VPS 上配置并启动 admin-hook-server（供 Docker 内 git-sync 使用）。

读取本地 .deploy.env；会写入/更新远端仓库 .env 中的
DEPLOY_HOOK_URL / DEPLOY_HOOK_TOKEN，并以 nohup 守护 hook 进程。
"""
from __future__ import annotations

import os
import re
import secrets
import sys
import time
from pathlib import Path

try:
    import paramiko
except ImportError:
    print("请先安装 paramiko: pip install paramiko", file=sys.stderr)
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


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 120) -> tuple[int, str]:
    print(f"[hook-setup] $ {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    text = (out + err).strip()
    if text:
        print(text)
    return code, text


def upsert_env_remote(client: paramiko.SSHClient, repo: str, key: str, value: str) -> None:
    """在远端 .env 中写入或替换 KEY=value（简单行级替换）。"""
    # 用 python3 在远端安全改写，避免 shell 转义问题
    py = f"""
import pathlib, re
p = pathlib.Path({repo!r}) / ".env"
text = p.read_text(encoding="utf-8", errors="replace") if p.exists() else ""
pat = re.compile(r"^{re.escape(key)}=.*$", re.M)
line = {key!r} + "=" + {value!r}
if pat.search(text):
    text = pat.sub(line, text)
else:
    if text and not text.endswith("\\n"):
        text += "\\n"
    text += "\\n# admin git-sync / deploy hook\\n" + line + "\\n"
p.write_text(text, encoding="utf-8")
print("updated", {key!r})
"""
    sftp = client.open_sftp()
    remote = "/tmp/_kb_upsert_env.py"
    with sftp.file(remote, "w") as f:
        f.write(py)
    sftp.close()
    run(client, f"python3 {remote}; rm -f {remote}")


def main() -> int:
    cfg = load_env(ENV_FILE)
    host = cfg.get("VPS_HOST") or os.environ.get("VPS_HOST")
    user = cfg.get("VPS_USER") or os.environ.get("VPS_USER", "root")
    password = cfg.get("VPS_PASSWORD") or os.environ.get("VPS_PASSWORD")
    port = int(cfg.get("VPS_PORT") or os.environ.get("VPS_PORT") or "22")
    repo = cfg.get("VPS_REPO_DIR") or os.environ.get("VPS_REPO_DIR", "/var/www/blog/Zoo-Blog")
    compose_args = cfg.get("COMPOSE_ARGS") or os.environ.get("COMPOSE_ARGS", "--profile rag")

    token = (
        cfg.get("DEPLOY_HOOK_TOKEN")
        or os.environ.get("DEPLOY_HOOK_TOKEN")
        or secrets.token_urlsafe(24)
    )
    hook_url = (
        cfg.get("DEPLOY_HOOK_URL")
        or os.environ.get("DEPLOY_HOOK_URL")
        or "http://host.docker.internal:9090/"
    )

    if not host or not password:
        print("缺少 VPS_HOST / VPS_PASSWORD", file=sys.stderr)
        return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"[hook-setup] 连接 {user}@{host}:{port} …")
    client.connect(host, port=port, username=user, password=password, timeout=30)

    upsert_env_remote(client, repo, "DEPLOY_HOOK_URL", hook_url)
    upsert_env_remote(client, repo, "DEPLOY_HOOK_TOKEN", token)

    # 停旧 hook（按端口 / 脚本名）
    run(
        client,
        "pkill -f 'scripts/admin-hook-server.py' || true; "
        "fuser -k 9090/tcp 2>/dev/null || true",
    )
    time.sleep(1)

    # 后台启动；TOKEN 写入进程环境，同时脚本也会读 .env
    start = (
        f"cd {repo} && "
        f"DEPLOY_HOOK_TOKEN={token!r} nohup python3 scripts/admin-hook-server.py "
        f">> /var/log/blog-admin-hook.log 2>&1 & echo $!"
    )
    # 上面 token!r 在 f-string 会带引号，shell 不需要；改用环境导出
    start = (
        f"cd {repo} && "
        f"export DEPLOY_HOOK_TOKEN='{token}' && "
        "nohup python3 scripts/admin-hook-server.py "
        ">> /var/log/blog-admin-hook.log 2>&1 & echo $!"
    )
    code, out = run(client, start)
    if code != 0:
        client.close()
        return code

    time.sleep(1)
    code, health = run(client, "curl -sS http://127.0.0.1:9090/health || true")
    if '"ok"' not in health and '"ok": true' not in health.replace(" ", ""):
        # 宽松匹配
        if "admin-hook" not in health:
            print("[hook-setup] health 检查未通过，查看 /var/log/blog-admin-hook.log", file=sys.stderr)
            run(client, "tail -n 40 /var/log/blog-admin-hook.log || true")
            client.close()
            return 1

    print("[hook-setup] hook 已就绪:", health)

    # 重建 app 以注入新 env（不强制全量 rebuild，若镜像已是最新）
    run(
        client,
        f"cd {repo} && docker compose {compose_args} up -d --force-recreate --no-deps app",
        timeout=300,
    )

    # 确认容器内可见
    run(
        client,
        "docker exec knowledge-blog-app printenv DEPLOY_HOOK_URL DEPLOY_HOOK_TOKEN || true",
    )

    client.close()
    print("[hook-setup] 完成")
    print("[hook-setup] 提示：可将 DEPLOY_HOOK_TOKEN 同步写回本地 .deploy.env（勿提交）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
