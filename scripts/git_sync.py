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
    cwd: Path,
    args: list[str],
    timeout: int = 120,
    *,
    env: dict[str, str] | None = None,
) -> tuple[int, str, str]:
    merged = os.environ.copy()
    if env:
        merged.update(env)
    proc = subprocess.run(
        args,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
        shell=False,
        env=merged,
    )
    return proc.returncode, proc.stdout or "", proc.stderr or ""


def ensure_git_identity(repo: Path, file_cfg: dict[str, str] | None = None) -> dict[str, str]:
    """保证 commit 有作者信息（VPS 常未配置 user.name/email）。"""
    file_cfg = file_cfg or {}
    name = cfg_get(file_cfg, "GIT_AUTHOR_NAME", "knowledge-blog-bot") or "knowledge-blog-bot"
    email = (
        cfg_get(file_cfg, "GIT_AUTHOR_EMAIL", "blog-bot@users.noreply.github.com")
        or "blog-bot@users.noreply.github.com"
    )
    # 仅写入本仓库 local config，避免改动系统全局
    run(repo, ["git", "config", "user.name", name], timeout=15)
    run(repo, ["git", "config", "user.email", email], timeout=15)
    return {
        "GIT_AUTHOR_NAME": name,
        "GIT_AUTHOR_EMAIL": email,
        "GIT_COMMITTER_NAME": name,
        "GIT_COMMITTER_EMAIL": email,
    }


def sync(
    repo: Path,
    *,
    message: str | None = None,
    remote: str = "origin",
    branch: str = "main",
    paths: list[str] | None = None,
    file_cfg: dict[str, str] | None = None,
) -> dict:
    paths = paths or ["content", "public/images"]
    git_dir = repo / ".git"
    if not git_dir.exists():
        return {
            "success": False,
            "message": f"不是 git 仓库：{repo}",
            "output": "",
        }

    identity_env = ensure_git_identity(repo, file_cfg)

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
    # -c 再兜一层，即使 config 写入失败也能 commit
    commit_args = [
        "git",
        "-c",
        f"user.name={identity_env['GIT_AUTHOR_NAME']}",
        "-c",
        f"user.email={identity_env['GIT_AUTHOR_EMAIL']}",
        "commit",
        "-m",
        msg,
    ]
    code, cout, cerr = run(repo, commit_args, timeout=60, env=identity_env)
    if code != 0:
        detail = (cerr or cout).strip()
        hint = ""
        if "Author identity unknown" in detail or "user.email" in detail:
            hint = "（已尝试自动设置作者；请检查仓库写权限）"
        return {
            "success": False,
            "message": f"git commit 失败{hint}",
            "output": detail,
        }

    code, pout, perr = run(repo, ["git", "push", remote, branch], timeout=120, env=identity_env)
    if code != 0 and ("fetch first" in (perr + pout) or "rejected" in (perr + pout)):
        # 常见于：本机已推代码，VPS 仅有内容提交 → 先 rebase 再推
        fcode, fout, ferr = run(repo, ["git", "fetch", remote], timeout=60, env=identity_env)
        if fcode == 0:
            rcode, rout, rerr = run(
                repo,
                ["git", "pull", "--rebase", remote, branch],
                timeout=120,
                env=identity_env,
            )
            if rcode == 0:
                code, pout, perr = run(
                    repo, ["git", "push", remote, branch], timeout=120, env=identity_env
                )
            else:
                return {
                    "success": False,
                    "message": "git push 前 rebase 失败（请勿在有冲突时强推）",
                    "output": "\n".join(
                        x
                        for x in [
                            pout.strip(),
                            perr.strip(),
                            rout.strip(),
                            rerr.strip(),
                        ]
                        if x
                    ),
                }

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
        file_cfg=file_cfg,
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
