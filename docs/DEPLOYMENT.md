# 🚀 部署指南

本文档介绍如何将博客部署到可访问的环境，涵盖 **Docker 全栈部署**（本地 / 单机生产）和 **VPS + PM2 + Nginx**（传统生产）两种方式。

**当前版本：0.4.2**

---

## 目录

1. [部署方式选择](#1-部署方式选择)
2. [Docker 全栈部署](#2-docker-全栈部署)
3. [VPS 生产部署（PM2 + Nginx）](#3-vps-生产部署pm2--nginx)
4. [购买域名与 DNS](#4-购买域名与-dns)
5. [Nginx 与 SSL](#5-nginx-与-ssl)
6. [验证上线](#6-验证上线)
7. [一键部署脚本](#7-一键部署脚本)
8. [常见部署问题](#8-常见部署问题)

---

## 1. 部署方式选择

| 方式 | 适用场景 | 优点 | 缺点 |
|------|----------|------|------|
| **Docker Compose** | 本地完整验收、单机 VPS、内网部署 | 一条命令拉起应用 + Meilisearch + Qdrant；环境一致 | 需熟悉 Docker；多机扩展需额外编排 |
| **PM2 + Nginx** | 传统 Linux VPS、已有 Node 运维经验 | 资源占用略低；与系统 Nginx 深度集成 | 需手动安装 Node、构建、守护进程 |

两种方式可并存：开发用 Docker，生产用 PM2；或生产全程 Docker + 前置 Nginx 反代。

### 服务组件一览

| 组件 | 端口（默认） | 是否必需 | 说明 |
|------|-------------|----------|------|
| Next.js 应用 | 3000 | ✅ | 主站与 API |
| Meilisearch | 7700 | 推荐 | 全文搜索；未配置时回退 SQLite |
| Qdrant | 6333 | 可选 | RAG 向量库；`/ask` 需要 |
| MinIO | 9000/9001 | 可选 | 对象存储，`--profile storage` |
| Nginx | 80/443 | 生产推荐 | 反代、SSL、静态资源 |

---

## 2. Docker 全栈部署

### 2.1 架构示意

```
浏览器 :3000
    │
    ▼
┌─────────────────────────────────────┐
│  knowledge-blog-app（Next.js）       │
│  - 挂载 content/、prisma/、uploads/  │
│  - 环境变量覆盖 Meili/Qdrant 内网地址 │
└──────┬──────────────────┬───────────┘
       │ blog-net         │
       ▼                  ▼
  meilisearch:7700   qdrant:6333
```

### 2.2 前置要求

- Docker Engine ≥ 24
- Docker Compose v2
- 至少 **2 GB** 内存（构建 Next.js 镜像时峰值较高）
- 磁盘 ≥ 10 GB（含 node_modules 构建缓存）

### 2.3 配置环境变量

```bash
cd knowledge-blog
cp .env.example .env
```

**最少配置：**

```bash
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="strong-password"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"   # Windows 可手动填随机串
NEXTAUTH_URL="http://localhost:3000"           # 生产改为 https://你的域名

NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_NAME="PLAIN MLOG"
NEXT_PUBLIC_SITE_AUTHOR="Your Name"

# Meilisearch（与 docker-compose 默认值一致即可）
MEILISEARCH_API_KEY="local-dev-master-key-16b"
```

**启用 RAG 问答时额外配置：**

```bash
LLM_PROVIDER="claude"          # 或 openrouter / openai 等
ANTHROPIC_API_KEY="sk-ant-..."
QDRANT_URL="http://localhost:6333"   # 宿主机脚本用；容器内由 compose 覆盖
EMBEDDING_PROVIDER="openai"
EMBEDDING_MODEL="text-embedding-3-small"
EMBEDDING_DIMENSION="1536"
```

> **容器网络说明**：`docker-compose.yml` 在 `app` 服务中设置了：
> ```yaml
> environment:
>   - MEILISEARCH_HOST=http://meilisearch:7700
>   - QDRANT_URL=http://qdrant:6333
> ```
> 这会覆盖 `.env` 里的 `localhost` 地址，使应用容器能通过 Docker 网络访问依赖服务。**不要**在 `.env` 里把这两项改成容器名，否则本机 `npm run dev` 会连不上。

### 2.4 构建与启动

```bash
# 应用 + Meilisearch + Qdrant（推荐）
docker compose --profile rag up -d --build

# 仅应用 + Meilisearch（不需要 RAG）
docker compose up -d --build

# 附加 MinIO 对象存储
docker compose --profile storage --profile rag up -d --build
```

首次构建约 3~5 分钟（下载依赖 + `next build`）。

### 2.5 数据持久化

以下目录通过 **bind mount** 持久化到宿主机，容器重建不丢失：

| 宿主机路径 | 容器路径 | 内容 |
|------------|----------|------|
| `./content` | `/app/content` | Markdown 真相源 |
| `./prisma` | `/app/prisma` | SQLite 数据库 `dev.db` |
| `./public/uploads` | `/app/public/uploads` | 用户上传附件 |

Docker **named volumes** 持久化：

| Volume | 服务 | 内容 |
|--------|------|------|
| `meili_data` | meilisearch | 搜索索引 |
| `qdrant_data` | qdrant | 向量数据 |
| `minio_data` | minio | 对象存储（可选） |

### 2.6 启动后初始化

1. 访问 http://localhost:3000/admin/login 登录后台
2. 「设置 → 从文件系统同步」导入 `content/` 笔记
3. （可选）「重建搜索索引」「重建向量索引」，或：
   ```bash
   docker compose exec app node -e "console.log('use admin settings or API')"
   # 宿主机执行（需本机有 node）：
   npm run search:reindex
   npm run rag:reindex
   ```

### 2.7 更新版本

```bash
git pull origin main
docker compose --profile rag up -d --build
```

应用容器启动时会自动执行 `prisma db push` 同步 Schema。

### 2.8 Docker + 前置 Nginx（单机生产）

若 Docker 跑在 VPS 上且需 HTTPS：

```nginx
# /etc/nginx/sites-available/knowledge-blog
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    client_max_body_size 15M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`.env` 中同步修改：

```bash
NEXTAUTH_URL="https://yourdomain.com"
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"
```

### 2.9 Windows 本地注意

- 确保 Docker Desktop 已启动，WSL2 后端推荐
- 路径 `./prisma`、`./content` 使用项目相对路径即可
- 若 3000 端口被占用，修改 `docker-compose.yml` 的 `ports: "3002:3000"`
- 停止所有容器后重新部署：`docker compose down && docker compose --profile rag up -d --build`

---

## 3. VPS 生产部署（PM2 + Nginx）

适合已有 Ubuntu VPS、希望用系统级 Nginx 与 PM2 守护的传统部署。

### 3.1 推荐配置

| 参数 | 最低 | 推荐 |
|------|------|------|
| CPU | 1 核 | 2 核 |
| 内存 | 1 GB | 2 GB |
| 硬盘 | 20 GB SSD | 40 GB SSD |
| 系统 | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### 3.2 环境初始化

SSH 登录 VPS：

```bash
apt update && apt upgrade -y
apt install -y git curl unzip nginx certbot python3-certbot-nginx

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version

# PM2
npm install -g pm2

# Docker（仅跑 Meilisearch / Qdrant）
curl -fsSL https://get.docker.com | bash
systemctl enable docker && systemctl start docker
```

### 3.3 克隆与配置

```bash
mkdir -p /var/www/blog && cd /var/www/blog
git clone https://github.com/recreateme/Zoo-Blog.git .
cp .env.example .env && nano .env
```

**生产必改项：**

```bash
DATABASE_URL="file:/var/www/blog/prisma/prod.db"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
ADMIN_EMAIL="your-email@example.com"
ADMIN_PASSWORD="strong-password"
ANTHROPIC_API_KEY="sk-ant-..."
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"
NEXT_PUBLIC_SITE_NAME="PLAIN MLOG"
MEILISEARCH_HOST="http://localhost:7700"
MEILISEARCH_API_KEY="your-production-meili-key"
QDRANT_URL="http://localhost:6333"
```

### 3.4 构建应用

```bash
npm ci --legacy-peer-deps
npx prisma generate
npx prisma db push
NODE_OPTIONS="--max-old-space-size=2048" npm run build
```

构建产物位于 `.next/standalone/`（`output: 'standalone'` 模式）。

### 3.5 启动依赖服务（Docker）

```bash
cd /var/www/blog
docker compose --profile rag up -d meilisearch qdrant
docker compose ps
```

应用本身由 PM2 运行，**不**放入 Docker（与 `docker-compose.yml` 中的 `app` 服务二选一）。

### 3.6 PM2 启动 Next.js

```bash
cd /var/www/blog
pm2 start npm --name "knowledge-blog" -- start
pm2 save
pm2 startup    # 按提示执行生成的 sudo 命令
```

---

## 4. 购买域名与 DNS

### 推荐注册商

| 注册商 | 特点 |
|--------|------|
| Cloudflare Registrar | 成本价，自带 CDN（境外 VPS 推荐） |
| 阿里云万网 | 国内备案方便 |
| Namesilo | 续费稳定 |

### DNS A 记录

```
类型    主机记录    记录值（VPS IP）    TTL
A       @           123.45.67.89        600
A       www         123.45.67.89        600
```

> **备案**：VPS 在中国大陆需 ICP 备案；境外 VPS 无需备案。

---

## 5. Nginx 与 SSL

### 5.1 使用项目模板

```bash
sed 's/yourdomain.com/你的真实域名/g' /var/www/blog/nginx.conf \
  > /etc/nginx/sites-available/knowledge-blog
ln -sf /etc/nginx/sites-available/knowledge-blog /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### 5.2 申请 Let's Encrypt 证书

```bash
certbot --nginx \
  -d yourdomain.com -d www.yourdomain.com \
  --non-interactive --agree-tos --email admin@yourdomain.com

certbot renew --dry-run   # 验证自动续期
```

---

## 6. 验证上线

访问并检查：

```
https://yourdomain.com           → 首页时间线
https://yourdomain.com/search    → 搜索
https://yourdomain.com/ask         → RAG 问答
https://yourdomain.com/graph       → 知识图谱
https://yourdomain.com/admin       → 后台
https://yourdomain.com/rss.xml
https://yourdomain.com/sitemap.xml
```

**检查清单：**

- [ ] HTTPS 绿锁正常
- [ ] 后台可登录，可发布笔记
- [ ] 搜索有结果（Meilisearch 已同步索引）
- [ ] 图片上传可访问
- [ ] `[[双向链接]]` 同步后图谱有节点
- [ ] RAG 问答返回答案与来源（如已配置 Qdrant + Embedding）
- [ ] RSS / Sitemap 格式正确

### 配置定时备份

```bash
chmod +x /var/www/blog/scripts/backup.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/blog/scripts/backup.sh >> /var/log/blog-backup.log 2>&1") | crontab -
```

---

## 7. 一键部署脚本

`scripts/deploy.sh` 面向 **Ubuntu 22.04 首次 VPS 部署**（PM2 模式）：

```bash
export DOMAIN="yourdomain.com"
export REPO_URL="https://github.com/recreateme/Zoo-Blog.git"
bash scripts/deploy.sh
```

脚本会安装 Node、Docker、Nginx、PM2，拉代码、构建、申请 SSL、配置 cron。运行到 `.env` 配置时会暂停，需手动编辑后重新执行。

---

## 8. 常见部署问题

### 构建内存不足

```bash
NODE_OPTIONS="--max-old-space-size=2048" npm run build
```

### Docker 首页 500 / 「未预期的错误」

```bash
docker compose logs app --tail 80
```

常见原因：
- `getFullYear is not a function` — 已在 0.4.2+ 修复（`unstable_cache` 日期反序列化）；请 `git pull` 后重新 `--build`
- 数据库不可写 — 检查 `prisma/` 目录权限
- Meilisearch 连不上 — 确认 `meilisearch` 容器运行中，且 compose 环境变量覆盖正确

### PM2 应用不响应

```bash
pm2 logs knowledge-blog --lines 50
pm2 restart knowledge-blog
```

### 上传 413

Nginx 配置增加 `client_max_body_size 15M;` 后 `systemctl reload nginx`。

### 端口冲突

```bash
ss -tlnp | grep ':3000'
# 停止占用进程，或修改 docker-compose ports / PM2 端口
```

### `next start` 与 standalone 警告

生产 Docker 镜像使用 `node server.js`（standalone 输出），不要用 `next start`。PM2 模式使用 `npm start`（即 `next start`）需确保 `next build` 完整。

---

## 下一步

- [运维手册](OPERATIONS.md) — 日常维护、备份、迁移
- [配置说明](CONFIGURATION.md) — 环境变量详解
- [架构说明](ARCHITECTURE.md) — 数据流与模块划分
