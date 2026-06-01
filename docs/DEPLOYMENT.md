# 🚀 部署指南

本文档介绍如何将博客部署到 VPS 生产环境，使其通过域名在公网访问。

---

## 目录

1. [购买域名](#1-购买域名)
2. [VPS 准备](#2-vps-准备)
3. [环境初始化](#3-环境初始化)
4. [项目部署](#4-项目部署)
5. [Nginx 配置](#5-nginx-配置)
6. [SSL 证书](#6-ssl-证书)
7. [启动服务](#7-启动服务)
8. [验证上线](#8-验证上线)
9. [一键部署脚本](#9-一键部署脚本)

---

## 1. 购买域名

### 推荐注册商

| 注册商 | .com 年费 | 特点 | 适合场景 |
|--------|-----------|------|----------|
| **Cloudflare Registrar** | ~$10 | 成本价，自带 CDN 和 DDoS 防护 | VPS 在境外（推荐） |
| **Namesilo** | ~$13 | 价格稳定，续费不涨价 | 长期持有 |
| **阿里云万网** | ~¥85 | 国内备案方便 | VPS 在国内 |

### 域名选择建议

```
yourname.dev        个人开发者品牌感强
yourname.me         个人博客常见后缀
notes.yourname.com  若已有主域名可用子域
```

### ⚠️ 备案说明

- **VPS 在中国大陆**：域名必须完成 ICP 备案，约需 20 个工作日，备案期间网站无法正常访问。
- **VPS 在境外**（推荐）：无需备案，注册域名后即可使用。

### DNS 配置

注册好域名后，在域名管理面板添加 A 记录：

```
类型    主机记录    记录值（你的 VPS IP）  TTL
A       @           123.45.67.89          600
A       www         123.45.67.89          600
```

---

## 2. VPS 准备

### 推荐配置

| 参数 | 最低配置 | 推荐配置 |
|------|----------|----------|
| CPU | 1 核 | 2 核 |
| 内存 | 1 GB | 2 GB |
| 硬盘 | 20 GB SSD | 40 GB SSD |
| 系统 | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| 带宽 | 1 Mbps | 不限流量 |

### 推荐服务商

| 服务商 | 月费参考 | 特点 |
|--------|----------|------|
| **Hetzner** | €4~€6 | 性价比最高，欧洲节点 |
| **Vultr** | $6~$12 | 全球节点，按小时计费 |
| **DigitalOcean** | $6~$12 | 文档完善，适合新手 |
| **阿里云轻量** | ¥45~¥90 | 国内访问快，需备案 |
| **腾讯云轻量** | ¥45~¥90 | 同上 |

---

## 3. 环境初始化

SSH 登录 VPS 后，执行以下命令：

```bash
# 更新系统
apt update && apt upgrade -y

# 安装基础工具
apt install -y git curl unzip nginx certbot python3-certbot-nginx

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version   # 应显示 v20.x.x

# 安装 PM2（进程守护）
npm install -g pm2

# 安装 Docker（用于 Meilisearch 和 Qdrant）
curl -fsSL https://get.docker.com | bash
systemctl enable docker
systemctl start docker

# 验证安装
docker --version
nginx -v
```

---

## 4. 项目部署

### 4.1 克隆代码

```bash
mkdir -p /var/www/blog
cd /var/www/blog
git clone https://github.com/yourname/knowledge-blog.git .
```

### 4.2 配置环境变量

```bash
cp .env.example .env
nano .env
```

**必须修改的配置项：**

```bash
# 生产环境数据库路径
DATABASE_URL="file:/var/www/blog/prisma/prod.db"

# NextAuth（必须设置为真实域名和随机密钥）
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"   # 用命令生成随机密钥

# 管理员账号
ADMIN_EMAIL="your-real-email@example.com"
ADMIN_PASSWORD="strong-password-here"

# AI 服务
ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxx"

# 站点信息
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"
NEXT_PUBLIC_SITE_NAME="你的知识库名称"
NEXT_PUBLIC_SITE_AUTHOR="你的名字"
```

### 4.3 安装依赖

```bash
npm install --legacy-peer-deps
```

### 4.4 初始化数据库

```bash
npx prisma generate
npx prisma db push
```

### 4.5 构建生产版本

```bash
npm run build
```

构建成功后，`.next/standalone/` 目录包含完整的生产服务器。

---

## 5. Nginx 配置

### 5.1 复制配置文件

```bash
# 将项目中的 nginx.conf 复制到系统配置目录，并替换域名
sed 's/yourdomain.com/你的真实域名/g' /var/www/blog/nginx.conf \
  > /etc/nginx/sites-available/knowledge-blog

# 启用站点
ln -sf /etc/nginx/sites-available/knowledge-blog \
        /etc/nginx/sites-enabled/knowledge-blog

# 删除默认站点（避免冲突）
rm -f /etc/nginx/sites-enabled/default

# 测试配置
nginx -t
```

### 5.2 临时 HTTP 配置（申请证书前）

在申请 SSL 证书前，需要先有一个能响应 HTTP 的配置。创建临时配置：

```bash
cat > /etc/nginx/sites-available/knowledge-blog-temp << EOF
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    location / { return 200 "OK"; }
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
}
EOF

ln -sf /etc/nginx/sites-available/knowledge-blog-temp \
        /etc/nginx/sites-enabled/knowledge-blog-temp
nginx -t && systemctl reload nginx
```

---

## 6. SSL 证书

使用 Let's Encrypt 申请免费证书（有效期 90 天，自动续期）：

```bash
certbot --nginx \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --non-interactive \
  --agree-tos \
  --email admin@yourdomain.com
```

证书申请成功后，切换回完整 Nginx 配置：

```bash
rm /etc/nginx/sites-enabled/knowledge-blog-temp
nginx -t && systemctl reload nginx
```

### 验证自动续期

```bash
# 测试续期（不实际更新）
certbot renew --dry-run

# 查看续期定时任务
systemctl status certbot.timer
```

---

## 7. 启动服务

### 7.1 启动后台数据库服务（Docker）

```bash
cd /var/www/blog

# 启动 Meilisearch 和 Qdrant（可选，搜索增强用）
docker compose up -d meilisearch qdrant

# 查看状态
docker compose ps
```

### 7.2 使用 PM2 启动 Next.js

```bash
cd /var/www/blog

# 启动应用
pm2 start npm --name "knowledge-blog" -- start

# 设置开机自启
pm2 save
pm2 startup
# 按照输出提示执行生成的命令（通常是一条 sudo 命令）
```

### 7.3 重新加载 Nginx

```bash
systemctl reload nginx
```

### 7.4 配置定时备份

```bash
chmod +x /var/www/blog/scripts/backup.sh

# 添加 cron 任务（每天凌晨 2 点备份）
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/blog/scripts/backup.sh >> /var/log/blog-backup.log 2>&1") | crontab -

# 查看 cron 任务
crontab -l
```

---

## 8. 验证上线

打开浏览器访问：

```
https://yourdomain.com          → 博客首页
https://yourdomain.com/admin    → 管理后台
https://yourdomain.com/rss.xml  → RSS 订阅
https://yourdomain.com/sitemap.xml → 站点地图
```

**检查清单：**

- [ ] 博客首页正常加载，HTTPS 绿锁显示
- [ ] 管理后台可以登录
- [ ] 新建一篇笔记并发布，前台能看到
- [ ] 上传一张图片，URL 可访问
- [ ] RSS 和 Sitemap 格式正确
- [ ] AI 功能（摘要/标签）可以使用

---

## 9. 一键部署脚本

项目提供了自动化部署脚本，可以跳过以上大部分手动步骤：

```bash
# 在 VPS 上执行（需要先配置好 DNS）
export DOMAIN="yourdomain.com"
export REPO_URL="https://github.com/yourname/knowledge-blog.git"

bash /var/www/blog/scripts/deploy.sh
```

脚本会自动完成：环境安装、代码拉取、依赖安装、数据库初始化、Nginx 配置、SSL 申请、PM2 启动、定时备份配置。

> **注意**：脚本运行到配置环境变量步骤时会暂停，需要手动编辑 `.env` 后重新运行。

---

## 常见部署问题

**Q: `npm run build` 报错 `heap out of memory`？**

```bash
# 增大 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=2048" npm run build
```

**Q: Nginx 启动报错 `bind() to 0.0.0.0:443 failed`？**

SSL 配置引用了不存在的证书文件，先完成第 5.2 步的临时配置，申请完证书再切换。

**Q: PM2 重启后应用不响应？**

```bash
pm2 logs knowledge-blog --lines 50   # 查看错误日志
pm2 restart knowledge-blog            # 重启
```

**Q: 上传附件失败，报 413 错误？**

编辑 `/etc/nginx/sites-available/knowledge-blog`，确认有：
```nginx
client_max_body_size 15M;
```
然后 `systemctl reload nginx`。

---

## 下一步

- 查看 [运维手册](OPERATIONS.md) 了解日常维护、备份恢复和 VPS 迁移方案
- 查看 [配置说明](CONFIGURATION.md) 了解更多高级配置
