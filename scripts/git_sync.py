#!/usr/bin/env python3
"""将 content/ 与 public/images/ 提交并推送到 GitHub。

在仓库根目录或设置 REPO_DIR / VPS_REPO_DIR 后运行：
  python scripts/git-sync.py
  python scripts/git-sync.py --message "chore: publish content"
  python scripts/git-sync.py --json

读取 .deploy.env / 环境变量：GIT_REMOTE、GIT_BRANCH、GIT_SYNC_PATHS、REPO_DIR。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import date
from pathlib import Path

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


def cfg_get(file_cfg: dict[str, str], key: str, default: str = "") -> str:
    return (os.environ.get(key) or file_cfg.get(key) or default).strip()


def run(
    cwd: Path, args: list[str], timeout: int = 120
) -> tuple[int, str, str]:
    proc = subprocess.run(
        args,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
        shell=False,
    )
    return proc.returncode, proc.stdout or "", proc.stderr or ""


def sync(
    repo: Path,
    *,
    message: str | None = None,
    remote: str = "origin",
    branch: str = "main",
    paths: list[str] | None = None,
) -> dict:
    paths = paths or ["content", "public/images"]
    git_dir = repo / ".git"
    if not git_dir.exists():
        return {
            "success": False,
            "message": f"不是 git 仓库：{repo}",
            "output": "",
        }

    code, out, err = run(repo, ["git", "add", "--", *paths], timeout=60)
    if code != 0:
        return {
            "success": False,
            "message": "git add 失败",
            "output": (err or out).strip(),
        }

    code, staged, _ = run(repo, ["git", "diff", "--cached", "--name-only"], timeout=30)
    if not staged.strip():
        return {
            "success": True,
            "message": "无内容变更，已跳过 commit/push",
            "output": "",
            "skipped": True,
        }

    msg = (message or "").strip() or f"chore: publish content {date.today().isoformat()}"
    code, cout, cerr = run(repo, ["git", "commit", "-m", msg], timeout=60)
    if code != 0:
        return {
            "success": False,
            "message": "git commit 失败",
            "output": (cerr or cout).strip(),
        }

    code, pout, perr = run(repo, ["git", "push", remote, branch], timeout=120)
    output = "\n".join(
        x for x in [cout.strip(), pout.strip(), perr.strip()] if x
    )
    if code != 0:
        return {
            "success": False,
            "message": "git push 失败",
            "output": output,
        }
    return {
        "success": True,
        "message": f"已推送到 {remote}/{branch}",
        "output": output,
        "files": [line for line in staged.splitlines() if line.strip()],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Push content/images to GitHub")
    parser.add_argument("--message", "-m", default=None)
    parser.add_argument("--json", action="store_true", help="以 JSON 打印结果")
    parser.add_argument("--repo", default=None, help="仓库根目录")
    args = parser.parse_args()

    file_cfg = load_env(ENV_FILE)
    repo = Path(
        args.repo
        or cfg_get(file_cfg, "REPO_DIR")
        or cfg_get(file_cfg, "VPS_REPO_DIR")
        or str(ROOT)
    ).resolve()
    remote = cfg_get(file_cfg, "GIT_REMOTE", "origin") or "origin"
    branch = cfg_get(file_cfg, "GIT_BRANCH", "main") or "main"
    paths_raw = cfg_get(file_cfg, "GIT_SYNC_PATHS", "content public/images")
    paths = [p for p in paths_raw.replace(",", " ").split() if p]

    result = sync(
        repo,
        message=args.message,
        remote=remote,
        branch=branch,
        paths=paths,
    )
    if args.json:
        print(json.dumps(result, ensure_ascii=False))
    else:
        print(f"[git-sync] {result['message']}")
        if result.get("output"):
            print(result["output"])
        if result.get("files"):
            for f in result["files"]:
                print(f"  + {f}")
    return 0 if result.get("success") else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.TimeoutExpired:
        print("[git-sync] 命令超时", file=sys.stderr)
        raise SystemExit(124)
