# ============================================================
# 更新 VPS 上的博客（git pull + docker rebuild + sync）
# 用法：.\scripts\deploy-vps.ps1
# 配置：.deploy.env（见 .deploy.env.example）
# ============================================================
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$EnvFile = Join-Path $Root ".deploy.env"
if (-not (Test-Path $EnvFile)) {
    Write-Host "[deploy] 请先复制 .deploy.env.example 为 .deploy.env 并填写" -ForegroundColor Yellow
    exit 1
}

try {
    python -c "import paramiko" 2>$null
    if ($LASTEXITCODE -ne 0) { throw "no paramiko" }
} catch {
    Write-Host "[deploy] 正在安装 paramiko…" -ForegroundColor Yellow
    pip install paramiko --quiet
}

python (Join-Path $Root "scripts\deploy-vps.py")
exit $LASTEXITCODE
