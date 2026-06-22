#!/bin/bash
# ============================================================
# VPS 首次部署脚本（Ubuntu 22.04）
# 用法：curl -fsSL https://raw.githubusercontent.com/你的用户名/仓库名/main/scripts/deploy.sh | bash
# 或：./scripts/deploy.sh
# ============================================================

set -e

REPO_URL="${REPO_URL:-https://github.com/yourname/knowledge-blog.git}"
DEPLOY_DIR="/var/www/blog"
DOMAIN="${DOMAIN:-yourdomain.com}"
NODE_VERSION="20"

echo "🚀 开始部署个人知识库博客..."
echo "  域名: $DOMAIN"
echo "  目录: $DEPLOY_DIR"

# ─── 系统更新 ─────────────────────────────────────────────
echo "📦 更新系统包..."
apt update && apt upgrade -y
apt install -y git curl unzip certbot python3-certbot-nginx

# ─── 安装 Node.js ─────────────────────────────────────────
echo "📦 安装 Node.js $NODE_VERSION..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
fi
echo "Node.js: $(node --version)"

# ─── 安装 PM2 ─────────────────────────────────────────────
npm install -g pm2

# ─── 安装 Docker ──────────────────────────────────────────
if ! command -v docker &> /dev/null; then
    echo "📦 安装 Docker..."
    curl -fsSL https://get.docker.com | bash
    systemctl enable docker
fi

# ─── 安装 Nginx ───────────────────────────────────────────
apt install -y nginx
systemctl enable nginx

# ─── 克隆项目 ─────────────────────────────────────────────
echo "📥 克隆项目代码..."
mkdir -p "$DEPLOY_DIR"
if [ -d "$DEPLOY_DIR/.git" ]; then
    cd "$DEPLOY_DIR" && git pull origin main
else
    git clone "$REPO_URL" "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
fi

# ─── 配置环境变量 ─────────────────────────────────────────
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    echo "⚙️  请配置环境变量..."
    cp "$DEPLOY_DIR/.env.example" "$DEPLOY_DIR/.env"
    echo "⚠️  请编辑 $DEPLOY_DIR/.env 填写必要配置，然后重新运行此脚本的后续步骤"
    echo "    关键配置项：DATABASE_URL, NEXTAUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, ANTHROPIC_API_KEY"
    exit 0
fi

# ─── 安装依赖 & 构建 ──────────────────────────────────────
echo "📦 安装 npm 依赖..."
cd "$DEPLOY_DIR"
npm ci --legacy-peer-deps

echo "🔨 生成 Prisma 客户端..."
npx prisma generate

echo "🗄️  初始化数据库..."
npx prisma db push

echo "🏗️  构建 Next.js..."
npm run build

# ─── 启动 Docker 服务 ─────────────────────────────────────
echo "🐳 启动搜索和向量数据库服务..."
docker compose --profile rag up -d meilisearch qdrant

# ─── PM2 启动应用 ─────────────────────────────────────────
echo "🟢 启动应用..."
pm2 delete knowledge-blog 2>/dev/null || true
pm2 start npm --name "knowledge-blog" -- start
pm2 save
pm2 startup | tail -1 | bash  # 设置开机自启

# ─── Nginx 配置 ───────────────────────────────────────────
echo "🌐 配置 Nginx..."
sed "s/yourdomain.com/$DOMAIN/g" "$DEPLOY_DIR/nginx.conf" \
    > /etc/nginx/sites-available/knowledge-blog
ln -sf /etc/nginx/sites-available/knowledge-blog /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# ─── SSL 证书 ─────────────────────────────────────────────
echo "🔒 申请 SSL 证书..."
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN"

# ─── 定时备份 ─────────────────────────────────────────────
echo "⏰ 配置定时备份..."
chmod +x "$DEPLOY_DIR/scripts/backup.sh"
(crontab -l 2>/dev/null; echo "0 2 * * * $DEPLOY_DIR/scripts/backup.sh >> /var/log/blog-backup.log 2>&1") | crontab -

echo ""
echo "✅ 部署完成！"
echo "   博客地址：https://$DOMAIN"
echo "   管理后台：https://$DOMAIN/admin"
echo "   PM2 状态：pm2 status"
echo "   查看日志：pm2 logs knowledge-blog"
