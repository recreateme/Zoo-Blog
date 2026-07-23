#!/usr/bin/env python3
"""管理后台宿主机 Hook：处理 git-sync / deploy-vps。

Docker 内的 Next 应用没有可用的 .git / SSH 凭据时，把
DEPLOY_HOOK_URL 指到本服务（建议仅监听本机或 Docker 网桥）。

用法（在 VPS 仓库根目录）：
  export DEPLOY_HOOK_TOKEN=your-shared-secret
  python scripts/admin-hook-server.py

可选环境变量：
  ADMIN_HOOK_HOST=0.0.0.0
  ADMIN_HOOK_PORT=9090
  REPO_DIR / VPS_REPO_DIR  仓库路径（默认本脚本上级）
  COMPOSE_ARGS             默认 --profile rag
  TRIGGER_SYNC             默认 true
  DEPLOY_HOOK_TOKEN        必填（Bearer）

请求：
  POST /  Authorization: Bearer <token>
  {"action":"git-sync","message":"...","actor":"..."}
  {"action":"deploy-vps","actor":"..."}
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

from git_sync import cfg_get, load_env, sync  # noqa: E402

ENV_FILE = ROOT / ".deploy.env"


def repo_dir(file_cfg: dict[str, str]) -> Path:
    return Path(
        cfg_get(file_cfg, "REPO_DIR")
        or cfg_get(file_cfg, "VPS_REPO_DIR")
        or str(ROOT)
    ).resolve()


def run_local(cwd: Path, cmd: str, timeout: int = 900) -> tuple[int, str]:
    print(f"[hook] $ {cmd}")
    proc = subprocess.run(
        cmd,
        cwd=str(cwd),
        shell=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )
    out = ((proc.stdout or "") + (proc.stderr or "")).strip()
    if out:
        print(out)
    return proc.returncode, out


def handle_git_sync(file_cfg: dict[str, str], body: dict) -> dict:
    repo = repo_dir(file_cfg)
    remote = cfg_get(file_cfg, "GIT_REMOTE", "origin") or "origin"
    branch = cfg_get(file_cfg, "GIT_BRANCH", "main") or "main"
    paths_raw = cfg_get(file_cfg, "GIT_SYNC_PATHS", "content public/images")
    paths = [p for p in paths_raw.replace(",", " ").split() if p]
    result = sync(
        repo,
        message=body.get("message"),
        remote=remote,
        branch=branch,
        paths=paths,
    )
    actor = body.get("actor")
    if actor:
        result["actor"] = actor
    return result


def handle_deploy_vps(file_cfg: dict[str, str], body: dict) -> dict:
    repo = repo_dir(file_cfg)
    compose_args = cfg_get(file_cfg, "COMPOSE_ARGS", "--profile rag") or "--profile rag"
    trigger_sync = (cfg_get(file_cfg, "TRIGGER_SYNC", "true") or "true").lower() == "true"
    branch = cfg_get(file_cfg, "GIT_BRANCH", "main") or "main"

    code, out1 = run_local(
        repo,
        f"git fetch origin && git reset --hard origin/{branch} && git log -1 --oneline",
        timeout=120,
    )
    if code != 0:
        return {"success": False, "message": "git pull 失败", "output": out1}

    run_local(
        repo,
        "mkdir -p content public/uploads public/images"
        " && chown -R 1001:65533 content public/uploads public/images || true",
        timeout=60,
    )

    code, out2 = run_local(
        repo,
        f"docker compose {compose_args} up -d --build",
        timeout=900,
    )
    if code != 0:
        return {"success": False, "message": "docker compose 失败", "output": out2}

    sync_out = ""
    if trigger_sync:
        for _ in range(30):
            time.sleep(2)
            try:
                req = Request(
                    "http://127.0.0.1:3000/api/sync",
                    data=b"{}",
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                with urlopen(req, timeout=60) as res:
                    sync_out = res.read().decode("utf-8", errors="replace")
                    if res.status < 500:
                        break
            except Exception as exc:  # noqa: BLE001
                sync_out = str(exc)

    return {
        "success": True,
        "message": "VPS 部署完成（宿主机 hook）",
        "output": "\n".join(x for x in [out1, out2, sync_out] if x),
        "actor": body.get("actor"),
    }


class Handler(BaseHTTPRequestHandler):
    token: str = ""
    file_cfg: dict[str, str] = {}

    def log_message(self, fmt: str, *args) -> None:  # noqa: A003
        sys.stderr.write("[hook] %s - %s\n" % (self.address_string(), fmt % args))

    def _json(self, code: int, payload: dict) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:  # noqa: N802
        if self.path in ("/", "/health"):
            self._json(200, {"ok": True, "service": "admin-hook"})
            return
        self._json(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        auth = self.headers.get("Authorization", "")
        expected = f"Bearer {self.token}"
        if not self.token or auth != expected:
            self._json(401, {"error": "unauthorized"})
            return

        length = int(self.headers.get("Content-Length") or "0")
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self._json(400, {"error": "invalid json"})
            return

        action = (body.get("action") or "").strip()
        try:
            if action == "git-sync":
                result = handle_git_sync(self.file_cfg, body)
            elif action == "deploy-vps":
                result = handle_deploy_vps(self.file_cfg, body)
            else:
                self._json(400, {"error": f"unknown action: {action}"})
                return
        except Exception as exc:  # noqa: BLE001
            self._json(500, {"success": False, "message": "hook 执行异常", "output": str(exc)})
            return

        http_code = 200 if result.get("success") else 500
        self._json(http_code, result)


def main() -> int:
    # .deploy.env 优先于 .env 中的同名键；process env 仍最高优先（见 cfg_get）
    file_cfg = {**load_env(ROOT / ".env"), **load_env(ENV_FILE)}
    token = cfg_get(file_cfg, "DEPLOY_HOOK_TOKEN")
    if not token:
        print("[hook] 请设置 DEPLOY_HOOK_TOKEN（.env / .deploy.env / 环境变量）", file=sys.stderr)
        return 1

    host = cfg_get(file_cfg, "ADMIN_HOOK_HOST", "0.0.0.0") or "0.0.0.0"
    port = int(cfg_get(file_cfg, "ADMIN_HOOK_PORT", "9090") or "9090")

    Handler.token = token
    Handler.file_cfg = file_cfg

    server = ThreadingHTTPServer((host, port), Handler)
    print(f"[hook] listening on http://{host}:{port}")
    print(f"[hook] repo = {repo_dir(file_cfg)}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[hook] stopped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
