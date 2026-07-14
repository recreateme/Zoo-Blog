# ============================================================
# 提交笔记/代码到 GitHub，并更新 VPS
# 用法：
#   .\scripts\publish.ps1
#   .\scripts\publish.ps1 -Message "新增某篇笔记"
#   .\scripts\publish.ps1 -SkipDeploy
# ============================================================
param(
    [string]$Message = "",
    [switch]$SkipDeploy
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "[publish] 仓库: $Root"

git status -sb

# 默认暂存内容与配图；若有其它已修改文件可一并提交
git add content public/images 2>$null
git add -u content public/images 2>$null

# 也允许把当前已改动的应用代码一起发布
$status = git status --porcelain
if (-not $status) {
    Write-Host "[publish] 工作区无变更，跳过 commit/push" -ForegroundColor Yellow
} else {
    # 暂存常见发布相关文件（若已修改）
    git add CHANGELOG.md README.md docker-compose.yml app docs 笔记上传手册.md .deploy.env.example scripts/deploy-vps.py scripts/deploy-vps.ps1 scripts/publish.ps1 publish.bat 2>$null

    if (-not $Message) {
        $Message = "chore: publish content and site updates $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    }

    $pending = git diff --cached --name-only
    if (-not $pending) {
        Write-Host "[publish] 没有可提交的暂存文件。请先 git add 需要发布的路径。" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "[publish] 提交: $Message"
    git commit -m $Message
    Write-Host "[publish] 推送到 origin/main…"
    git push origin main
}

if ($SkipDeploy) {
    Write-Host "[publish] 已跳过 VPS 部署（-SkipDeploy）"
    exit 0
}

& (Join-Path $Root "scripts\deploy-vps.ps1")
exit $LASTEXITCODE
