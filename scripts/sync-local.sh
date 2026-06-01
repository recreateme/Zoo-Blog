#!/bin/bash
# ============================================================
# 本地笔记同步脚本（本地 → VPS）
# 用法：chmod +x scripts/sync-local.sh
#       ./scripts/sync-local.sh
#       或：watch -n 30 ./scripts/sync-local.sh  # 每30秒自动同步
# 配置：复制 .sync.env.example 为 .sync.env 并填写
# ============================================================

# 加载本地配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.sync.env"

if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
else
    cat > "$ENV_FILE" << 'EOF'
# 本地笔记目录（Obsidian vault 或其他）
LOCAL_NOTES_DIR="$HOME/Documents/my-notes"
# VPS 连接信息
VPS_HOST="your-vps-ip"
VPS_PORT="22"
VPS_USER="root"
VPS_CONTENT_DIR="/var/www/blog/content"
# 同步完成后是否触发重新索引（需要配置好 API）
TRIGGER_REINDEX=true
BLOG_URL="https://yourdomain.com"
ADMIN_API_KEY=""  # 如果有的话
EOF
    echo "⚠️  请先编辑 .sync.env 填写配置，然后重新运行"
    exit 1
fi

LOG_TAG="[sync]"
echo "$LOG_TAG $(date '+%H:%M:%S') 开始同步..."

# 检查必要变量
if [ -z "$LOCAL_NOTES_DIR" ] || [ -z "$VPS_HOST" ]; then
    echo "$LOG_TAG 错误：请在 .sync.env 中配置 LOCAL_NOTES_DIR 和 VPS_HOST"
    exit 1
fi

if [ ! -d "$LOCAL_NOTES_DIR" ]; then
    echo "$LOG_TAG 错误：本地目录不存在: $LOCAL_NOTES_DIR"
    exit 1
fi

# ─── rsync 同步 ────────────────────────────────────────────
rsync -avz \
    --delete \
    --progress \
    --exclude='.git/' \
    --exclude='.obsidian/' \
    --exclude='*.tmp' \
    --exclude='*.DS_Store' \
    --exclude='.trash/' \
    --include='*.md' \
    --include='*/' \
    --exclude='*' \
    -e "ssh -p ${VPS_PORT:-22}" \
    "$LOCAL_NOTES_DIR/" \
    "$VPS_USER@$VPS_HOST:$VPS_CONTENT_DIR/"

RSYNC_EXIT=$?

if [ $RSYNC_EXIT -ne 0 ]; then
    echo "$LOG_TAG 同步失败（rsync 退出码：$RSYNC_EXIT）"
    exit $RSYNC_EXIT
fi

echo "$LOG_TAG 同步完成"

# ─── 可选：触发重新索引 ────────────────────────────────────
if [ "$TRIGGER_REINDEX" = "true" ] && [ -n "$BLOG_URL" ]; then
    echo "$LOG_TAG 触发内容重新索引..."
    curl -s -X POST "$BLOG_URL/api/sync" \
        -H "Content-Type: application/json" \
        --max-time 10 \
        --silent \
        && echo "$LOG_TAG 索引触发成功" \
        || echo "$LOG_TAG 索引触发失败（不影响同步结果）"
fi

echo "$LOG_TAG ===== 全部完成 ====="
