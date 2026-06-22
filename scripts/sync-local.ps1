# ============================================================
# 本地笔记同步脚本（Windows PowerShell）
# 用法：.\scripts\sync-local.ps1
# 配置：复制 .sync.env.example 为 .sync.env 并填写
# 依赖：OpenSSH（Windows 10+ 自带）或 WSL 中的 rsync
# ============================================================

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path (Split-Path $ScriptDir -Parent) ".sync.env"

if (-not (Test-Path $EnvFile)) {
    Copy-Item (Join-Path (Split-Path $ScriptDir -Parent) ".sync.env.example") $EnvFile -ErrorAction SilentlyContinue
    Write-Host "[sync] 请先编辑 .sync.env 填写配置，然后重新运行" -ForegroundColor Yellow
    exit 1
}

# 解析 .sync.env（简单 key=value 格式）
$Config = @{}
Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        if ($line -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim().Trim('"')
            $Config[$key] = $val
        }
    }
}

function Get-Config($key, $default = "") {
    if ($Config.ContainsKey($key) -and $Config[$key]) { return $Config[$key] }
    return $default
}

$LocalNotes = Get-Config "LOCAL_NOTES_DIR"
$VpsHost = Get-Config "VPS_HOST"
$VpsPort = Get-Config "VPS_PORT" "22"
$VpsUser = Get-Config "VPS_USER" "root"
$VpsContent = Get-Config "VPS_CONTENT_DIR" "/var/www/blog/content"
$TriggerReindex = (Get-Config "TRIGGER_REINDEX" "true") -eq "true"
$BlogUrl = Get-Config "BLOG_URL"
$SyncSecret = Get-Config "SYNC_SECRET"
$SyncUploads = (Get-Config "SYNC_UPLOADS" "false") -eq "true"
$LocalUploads = Get-Config "LOCAL_UPLOADS_DIR" "./public/uploads"
$VpsUploads = Get-Config "VPS_UPLOADS_DIR" "/var/www/blog/public/uploads"

$LogTag = "[sync]"
Write-Host "$LogTag $(Get-Date -Format 'HH:mm:ss') 开始同步..."

if (-not $LocalNotes -or -not $VpsHost) {
    Write-Host "$LogTag 错误：请在 .sync.env 中配置 LOCAL_NOTES_DIR 和 VPS_HOST" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $LocalNotes)) {
    Write-Host "$LogTag 错误：本地目录不存在: $LocalNotes" -ForegroundColor Red
    exit 1
}

# 优先使用 WSL rsync（与 bash 脚本行为一致）
$RsyncCmd = $null
if (Get-Command wsl -ErrorAction SilentlyContinue) {
    $wslTest = wsl -e bash -c "command -v rsync" 2>$null
    if ($LASTEXITCODE -eq 0) { $RsyncCmd = "wsl" }
}

if ($RsyncCmd -eq "wsl") {
    $WslLocal = (wsl wslpath -a $LocalNotes).Trim()
    $RsyncArgs = @(
        "-avz", "--delete", "--progress",
        "--exclude=.git/", "--exclude=.obsidian/", "--exclude=*.tmp",
        "--exclude=*.DS_Store", "--exclude=.trash/",
        "--include=*.md", "--include=*/", "--exclude=*",
        "-e", "ssh -p $VpsPort",
        "$WslLocal/",
        "${VpsUser}@${VpsHost}:${VpsContent}/"
    )
    wsl rsync @RsyncArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Host "$LogTag 同步失败（rsync 退出码：$LASTEXITCODE）" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} else {
    # 回退：scp 递归（仅 .md 文件需手动维护目录结构）
    Write-Host "$LogTag 未检测到 WSL rsync，使用 scp 同步..." -ForegroundColor Yellow
    $MdFiles = Get-ChildItem -Path $LocalNotes -Filter "*.md" -Recurse -File
    foreach ($f in $MdFiles) {
        $rel = $f.FullName.Substring($LocalNotes.TrimEnd('\').Length + 1).Replace('\', '/')
        $remoteDir = Split-Path $rel -Parent
        if ($remoteDir -and $remoteDir -ne ".") {
            ssh -p $VpsPort "${VpsUser}@${VpsHost}" "mkdir -p `"${VpsContent}/${remoteDir}`"" 2>$null
        }
        scp -P $VpsPort $f.FullName "${VpsUser}@${VpsHost}:${VpsContent}/${rel}"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "$LogTag 同步失败：$rel" -ForegroundColor Red
            exit $LASTEXITCODE
        }
    }
}

Write-Host "$LogTag 笔记同步完成"

# 可选：同步附件
if ($SyncUploads) {
    $UploadPath = if ([System.IO.Path]::IsPathRooted($LocalUploads)) {
        $LocalUploads
    } else {
        Join-Path (Split-Path $ScriptDir -Parent) $LocalUploads
    }
    if (Test-Path $UploadPath) {
        Write-Host "$LogTag 同步附件目录..."
        if ($RsyncCmd -eq "wsl") {
            $WslUp = (wsl wslpath -a $UploadPath).Trim()
            wsl rsync -avz --progress -e "ssh -p $VpsPort" "$WslUp/" "${VpsUser}@${VpsHost}:${VpsUploads}/"
            if ($LASTEXITCODE -ne 0) {
                Write-Host "$LogTag 附件同步失败" -ForegroundColor Red
                exit $LASTEXITCODE
            }
        } else {
            scp -P $VpsPort -r $UploadPath "${VpsUser}@${VpsHost}:${VpsUploads}"
            if ($LASTEXITCODE -ne 0) {
                Write-Host "$LogTag 附件同步失败" -ForegroundColor Red
                exit $LASTEXITCODE
            }
        }
        Write-Host "$LogTag 附件同步完成"
    } else {
        Write-Host "$LogTag 跳过附件：本地目录不存在 $UploadPath" -ForegroundColor Yellow
    }
}

# 触发服务端重新索引
if ($TriggerReindex -and $BlogUrl) {
    if (-not $SyncSecret) {
        Write-Host "$LogTag 警告：未配置 SYNC_SECRET，无法自动触发 /api/sync" -ForegroundColor Yellow
    } else {
        Write-Host "$LogTag 触发内容重新索引..."
        $MaxAttempts = 3
        $Success = $false
        for ($i = 1; $i -le $MaxAttempts; $i++) {
            try {
                $resp = Invoke-WebRequest -Uri "$BlogUrl/api/sync" -Method POST `
                    -Headers @{ "X-Sync-Secret" = $SyncSecret; "Content-Type" = "application/json" } `
                    -TimeoutSec 180 -UseBasicParsing
                if ($resp.StatusCode -eq 200) {
                    Write-Host "$LogTag 索引触发成功 (尝试 $i): $($resp.Content)"
                    $Success = $true
                    break
                }
            } catch {
                $code = $_.Exception.Response.StatusCode.value__
                Write-Host "$LogTag 索引触发失败 HTTP $code (尝试 $i/$MaxAttempts)"
            }
            if ($i -lt $MaxAttempts) { Start-Sleep -Seconds 5 }
        }
        if (-not $Success) {
            Write-Host "$LogTag 警告：同步 API 最终失败，请手动在后台执行「从文件系统同步」" -ForegroundColor Yellow
            exit 2
        }
    }
}

Write-Host "$LogTag ===== 全部完成 =====" -ForegroundColor Green
