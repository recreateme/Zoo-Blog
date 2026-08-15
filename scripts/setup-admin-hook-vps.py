#!/usr/bin/env python3
"""在 VPS 上配置并启动 admin-hook-server（供 Docker 内 git-sync 使用）。"""
from __future__ import annotations

import os
import re
import secrets
import sys
import time
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".deploy.env"
HOOK_SCRIPT = "/tmp/kb-start-admin-hook.sh"
HOOK_LOG = "/var/log/blog-admin-hook.log"


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


def save_local_token(token: str, hook_url: str) -> None:
    """把 token/url 写回本地 .deploy.env（不打印密钥）。"""
    if not ENV_FILE.exists():
        return
    text = ENV_FILE.read_text(encoding="utf-8")
    for key, value in (
        ("DEPLOY_HOOK_URL", hook_url),
        ("DEPLOY_HOOK_TOKEN", token),
    ):
        pat = re.compile(rf"^{re.escape(key)}=.*$", re.M)
        line = f"{key}={value}"
        if pat.search(text):
            text = pat.sub(line, text)
        else:
            if text and not text.endswith("\n"):
                text += "\n"
            text += f"\n# admin git-sync / deploy hook\n{line}\n"
    ENV_FILE.write_text(text, encoding="utf-8")


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 60) -> tuple[int, str]:
    print(f"[hook-setup] $ {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    text = (out + err).strip()
    if text:
        print(text)
    return code, text


def upsert_env_remote(client: paramiko.SSHClient, repo: str, key: str, value: str) -> None:
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
    save_local_token(token, hook_url)

    # 停止旧的手工进程 / 旧 unit，安装 systemd 开机自启
    unit_src = ROOT / "scripts" / "blog-admin-hook.service"
    if not unit_src.exists():
        print(f"[hook-setup] 缺少 {unit_src}", file=sys.stderr)
        client.close()
        return 1

    run(
        client,
        "systemctl stop blog-admin-hook 2>/dev/null || true; "
        "pkill -f 'scripts/admin-hook-server.py' 2>/dev/null || true; "
        "fuser -k 9090/tcp 2>/dev/null || true",
    )
    time.sleep(1)

    sftp = client.open_sftp()
    with sftp.file("/tmp/blog-admin-hook.service", "w") as f:
        f.write(unit_src.read_text(encoding="utf-8"))
    sftp.close()

    # unit 内路径默认 /var/www/blog/Zoo-Blog；若 repo 不同则 sed 替换
    run(
        client,
        "cp /tmp/blog-admin-hook.service /etc/systemd/system/blog-admin-hook.service && "
        f"sed -i 's|/var/www/blog/Zoo-Blog|{repo}|g' /etc/systemd/system/blog-admin-hook.service && "
        "systemctl daemon-reload && "
        "systemctl enable --now blog-admin-hook && "
        "systemctl is-enabled blog-admin-hook && "
        "systemctl is-active blog-admin-hook",
    )
    time.sleep(2)

    _, health = run(client, "curl -sS http://127.0.0.1:9090/health || true")
    if "admin-hook" not in health:
        print("[hook-setup] health 检查未通过", file=sys.stderr)
        run(client, "systemctl status blog-admin-hook --no-pager -l | head -n 40 || true")
        run(client, f"tail -n 40 {HOOK_LOG} || true")
        client.close()
        return 1

    print("[hook-setup] systemd blog-admin-hook 已启用并运行")

    run(
        client,
        f"cd {repo} && docker compose {compose_args} up -d --force-recreate --no-deps app",
        timeout=300,
    )
    time.sleep(3)
    run(
        client,
        "docker exec knowledge-blog-app printenv DEPLOY_HOOK_URL || true",
    )
    # 不打印 TOKEN

    client.close()
    print("[hook-setup] 完成（TOKEN 已写入本地 .deploy.env，勿提交）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
