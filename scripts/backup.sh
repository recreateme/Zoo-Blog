#!/bin/bash
# ============================================================
# 每日自动备份脚本
# 用法：chmod +x scripts/backup.sh
# cron：0 2 * * * /var/www/blog/scripts/backup.sh >> /var/log/blog-backup.log 2>&1
# ============================================================

set -e

BLOG_DIR="/var/www/blog"
LOG_TAG="[knowledge-blog-backup]"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "$LOG_TAG ===== 开始备份 $DATE ====="

cd "$BLOG_DIR"

# ─── 1. 备份 SQLite 数据库 ────────────────────────────────
echo "$LOG_TAG 备份数据库..."
DB_BACKUP_DIR="$BLOG_DIR/content/_backups"
mkdir -p "$DB_BACKUP_DIR"

# 复制数据库文件（SQLite 支持热备份）
cp "$BLOG_DIR/prisma/dev.db" "$DB_BACKUP_DIR/db-$(date '+%Y%m%d').db"

# 保留最近 7 天的数据库备份
find "$DB_BACKUP_DIR" -name "db-*.db" -mtime +7 -delete
echo "$LOG_TAG 数据库备份完成"

# ─── 2. 提交内容变更到 Git ────────────────────────────────
echo "$LOG_TAG 提交内容到 Git..."
git add -A

if git diff --cached --quiet; then
    echo "$LOG_TAG 无内容变更，跳过提交"
else
    git commit -m "auto: daily backup $(date '+%Y-%m-%d')"
    echo "$LOG_TAG Git 提交完成"
fi

# ─── 3. 推送到远程仓库 ────────────────────────────────────
if [ -n "$(git remote)" ]; then
    echo "$LOG_TAG 推送到远程仓库..."
    git push origin main --quiet && echo "$LOG_TAG 推送成功" || echo "$LOG_TAG 推送失败（不影响本地备份）"
else
    echo "$LOG_TAG 未配置远程仓库，跳过推送"
fi

# ─── 4. 磁盘使用情况 ──────────────────────────────────────
echo "$LOG_TAG 磁盘使用："
du -sh "$BLOG_DIR/content" "$BLOG_DIR/public/uploads" "$BLOG_DIR/prisma" 2>/dev/null

echo "$LOG_TAG ===== 备份完成 ====="
