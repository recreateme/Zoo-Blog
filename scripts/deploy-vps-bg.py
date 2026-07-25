#!/usr/bin/env python3
"""在 VPS 上后台执行 docker compose build（避免 SSH 进度刷屏超时）。"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".deploy.env"
LOG = "/tmp/kb-docker-build.log"
PIDFILE = "/tmp/kb-docker-build.pid"
EXITFILE = "/tmp/kb-docker-build.exit"
BUILDSCRIPT = "/tmp/kb-docker-build.sh"


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


def sh(client: paramiko.SSHClient, cmd: str, timeout: int = 120) -> tuple[int, str]:
    print(f"[vps] $ {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    channel = stdout.channel
    channel.settimeout(timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = channel.recv_exit_status()
    text = (out + ("\n" + err if err.strip() else "")).strip()
    if text:
        print(text)
    return code, text


def main() -> int:
    cfg = load_env(ENV_FILE)
    host = cfg.get("VPS_HOST") or os.environ.get("VPS_HOST")
    user = cfg.get("VPS_USER") or os.environ.get("VPS_USER", "root")
    password = cfg.get("VPS_PASSWORD") or os.environ.get("VPS_PASSWORD")
    port = int(cfg.get("VPS_PORT") or os.environ.get("VPS_PORT") or "22")
    repo = cfg.get("VPS_REPO_DIR") or os.environ.get("VPS_REPO_DIR", "/var/www/blog/Zoo-Blog")
    compose_args = cfg.get("COMPOSE_ARGS") or os.environ.get("COMPOSE_ARGS", "--profile rag")
    if not host or not password:
        print("缺少 VPS 凭据", file=sys.stderr)
        return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=port, username=user, password=password, timeout=30)

    sh(
        client,
        f"set -e; cd {repo} && git fetch origin && git reset --hard origin/main && git log -1 --oneline",
    )
    sh(
        client,
        f"cd {repo} && mkdir -p content public/uploads public/images"
        " && chown -R 1001:65533 content public/uploads public/images",
    )

    # 清理旧任务
    sh(
        client,
        f"if [ -f {PIDFILE} ]; then kill $(cat {PIDFILE}) 2>/dev/null || true; fi; "
        "pkill -f 'docker compose .*up -d --build' 2>/dev/null || true; "
        f"rm -f {EXITFILE} {LOG}",
    )

    script = f"""#!/bin/bash
set -e
cd {repo}
export BUILDKIT_PROGRESS=plain
docker compose {compose_args} up -d --build > {LOG} 2>&1
echo $? > {EXITFILE}
"""
    sftp = client.open_sftp()
    with sftp.file(BUILDSCRIPT, "w") as f:
        f.write(script)
    sftp.close()
    sh(client, f"chmod +x {BUILDSCRIPT}")

    # 完全脱离 SSH 会话
    code, pid = sh(
        client,
        f"nohup {BUILDSCRIPT} </dev/null >/dev/null 2>&1 & echo $! > {PIDFILE}; cat {PIDFILE}",
    )
    pid = pid.strip().splitlines()[-1].strip() if pid.strip() else ""
    if code != 0 or not pid.isdigit():
        print("启动后台构建失败", file=sys.stderr)
        client.close()
        return 1
    print(f"[deploy] 后台构建 PID={pid}，日志 {LOG}")

    deadline = time.time() + 45 * 60
    while time.time() < deadline:
        time.sleep(25)
        try:
            client.get_transport().send_ignore()
        except Exception:
            pass
        # 仅当构建 PID 已退出时才视为结束；禁止仅凭陈旧 EXITFILE 误判成功
        _, alive = sh(
            client,
            f"if [ -f {PIDFILE} ] && kill -0 $(cat {PIDFILE}) 2>/dev/null; then echo RUNNING; "
            f"elif pgrep -af 'docker compose .*up -d --build' | grep -v pgrep >/dev/null; then echo RUNNING; "
            f"else echo DONE; fi",
        )
        sh(client, f"tail -n 6 {LOG} 2>/dev/null || echo '(log empty)'")
        if "DONE" in alive:
            _, exit_code = sh(client, f"cat {EXITFILE} 2>/dev/null || echo 1")
            _, created = sh(
                client,
                "docker inspect -f '{{.Created}}' knowledge-blog-app 2>/dev/null || echo none",
            )
            _, running = sh(
                client,
                "docker inspect -f '{{.State.Running}}' knowledge-blog-app 2>/dev/null || echo false",
            )
            _, log_tail = sh(client, f"tail -n 60 {LOG} || true")
            # 成功信号：exit 0，且日志出现容器启动/重建，或镜像导出完成
            log_ok = any(
                marker in log_tail
                for marker in (
                    "Started",
                    "Recreated",
                    "exporting to image",
                    "Built",
                )
            )
            client.close()
            ok = exit_code.strip() == "0" and "true" in running and log_ok
            if ok:
                print("[deploy] 构建完成，app 容器运行中")
                print("[deploy] created:", created.strip())
                return 0
            print("[deploy] 构建结束但未成功", file=sys.stderr)
            print("[deploy] exit=", exit_code.strip(), "running=", running.strip(), "log_ok=", log_ok)
            return 1

    print("[deploy] 等待超时", file=sys.stderr)
    client.close()
    return 124


if __name__ == "__main__":
    raise SystemExit(main())
