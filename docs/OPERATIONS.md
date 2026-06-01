# 🔧 运维手册

本文档涵盖日常运维、备份恢复、VPS 迁移、性能监控和常见故障排查。

---

## 目录

1. [日常运维命令](#1-日常运维命令)
2. [备份策略](#2-备份策略)
3. [数据恢复](#3-数据恢复)
4. [VPS 迁移](#4-vps-迁移)
5. [性能监控](#5-性能监控)
6. [升级与更新](#6-升级与更新)
7. [故障排查](#7-故障排查)

---

## 1. 日常运维命令

### 应用状态

```bash
# 查看 PM2 进程状态
pm2 status

# 查看实时日志
pm2 logs knowledge-blog

# 查看最近 100 行日志
pm2 logs knowledge-blog --lines 100

# 重启应用
pm2 restart knowledge-blog

# 停止应用
pm2 stop knowledge-blog

# 重载（零停机，用于更新代码后）
pm2 reload knowledge-blog
```

### Nginx

```bash
# 测试配置语法
nginx -t

# 重载配置（不中断连接）
systemctl reload nginx

# 查看访问日志（实时）
tail -f /var/log/nginx/access.log

# 查看错误日志
tail -f /var/log/nginx/error.log
```

### Docker 服务

```bash
cd /var/www/blog

# 查看所有服务状态
docker compose ps

# 查看 Meilisearch 日志
docker compose logs meilisearch

# 重启 Meilisearch
docker compose restart meilisearch

# 停止所有服务
docker compose down

# 启动所有服务
docker compose up -d
```

### 数据库

```bash
# 进入 Prisma Studio（可视化查看数据库）
cd /var/www/blog
npx prisma studio
# 然后访问 http://localhost:5555

# 直接查询 SQLite
sqlite3 /var/www/blog/prisma/dev.db

# 常用 SQL
.tables                          # 查看所有表
SELECT count(*) FROM Post;       # 文章总数
SELECT * FROM Post ORDER BY publishedAt DESC LIMIT 5;  # 最新5篇
.quit
```

### SSL 证书

```bash
# 查看证书有效期
certbot certificates

# 手动更新证书
certbot renew

# 强制更新（证书仍有效时）
certbot renew --force-renewal
```

---

## 2. 备份策略

遵循 **3-2-1 原则**：3 份副本，2 种介质，1 份异地。

### 自动备份（已通过 cron 配置）

```bash
# 查看当前 cron 任务
crontab -l

# 备份脚本每天凌晨 2:00 执行，完成：
# 1. SQLite 数据库复制到 content/_backups/
# 2. git add -A && git commit
# 3. git push 到远程仓库（如配置了 GIT_REMOTE_URL）
```

### 手动立即备份

```bash
bash /var/www/blog/scripts/backup.sh
```

### 备份内容清单

| 数据 | 位置 | 备份方式 | 重要性 |
|------|------|----------|--------|
| Markdown 文章 | `content/` | Git 仓库 | ⭐⭐⭐ 最重要 |
| 数据库（元数据） | `prisma/dev.db` | Git + 本地 | ⭐⭐ 可从内容重建 |
| 上传附件 | `public/uploads/` | 手动 rsync | ⭐⭐ 不可重建 |
| 环境配置 | `.env` | 手动保存 | ⭐ 可重新配置 |

### 附件备份（手动）

附件不进入 Git（体积太大），需要单独备份：

```bash
# 从 VPS 同步附件到本地
rsync -avz \
  root@your-vps-ip:/var/www/blog/public/uploads/ \
  ~/backup/blog-uploads/

# 或者：备份到对象存储（需安装 rclone）
rclone sync /var/www/blog/public/uploads/ s3:your-bucket/uploads/
```

建议每周备份一次附件。

---

## 3. 数据恢复

### 从 Git 恢复文章内容

```bash
cd /var/www/blog

# 查看提交历史
git log --oneline

# 恢复到某个时间点
git checkout <commit-hash> -- content/

# 恢复特定文件
git checkout <commit-hash> -- content/ai/introduction-to-llm.md
```

### 从备份恢复数据库

```bash
# 停止应用
pm2 stop knowledge-blog

# 替换数据库文件
cp content/_backups/db-2024-01-15.db prisma/dev.db

# 启动应用
pm2 start knowledge-blog
```

### 从内容目录重建数据库

如果数据库完全丢失，但 content/ 目录完好，可以完全重建：

```bash
# 删除旧数据库
rm -f prisma/dev.db

# 重新建表
npx prisma db push

# 从文件系统重新索引所有文章
curl -X POST https://yourdomain.com/api/sync \
  -H "Authorization: Bearer your-token"

# 或者在后台「设置」页面点击「从文件系统同步」
```

---

## 4. VPS 迁移

VPS 到期或需要迁移时，按以下步骤操作，**目标停机时间 < 30 分钟**。

### 第一步：准备新 VPS

在新 VPS 上重复部署流程：

```bash
# 安装环境（参考部署指南）
apt update && apt upgrade -y
apt install -y git curl nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
curl -fsSL https://get.docker.com | bash
```

### 第二步：迁移代码和内容

```bash
# 克隆代码仓库（包含内容）
git clone https://github.com/yourname/knowledge-blog.git /var/www/blog
cd /var/www/blog

# 安装依赖
npm install --legacy-peer-deps

# 复制环境变量（从旧服务器或本地备份）
scp root@old-vps-ip:/var/www/blog/.env .env
```

### 第三步：迁移数据库

```bash
# 从旧服务器复制最新数据库
scp root@old-vps-ip:/var/www/blog/prisma/dev.db /var/www/blog/prisma/dev.db

# 或者：重新执行 Prisma 建表，然后从 Git 同步内容
npx prisma db push
```

### 第四步：迁移附件

```bash
# 从旧服务器同步附件
rsync -avz \
  root@old-vps-ip:/var/www/blog/public/uploads/ \
  /var/www/blog/public/uploads/
```

### 第五步：构建并启动

```bash
npm run build
pm2 start npm --name "knowledge-blog" -- start
pm2 save && pm2 startup
docker compose up -d
```

### 第六步：配置 Nginx 和证书

```bash
# 配置 Nginx（参考部署指南）
sed 's/yourdomain.com/你的域名/g' nginx.conf > /etc/nginx/sites-available/knowledge-blog
ln -sf /etc/nginx/sites-available/knowledge-blog /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 申请新证书
certbot --nginx -d yourdomain.com -d www.yourdomain.com \
  --non-interactive --agree-tos --email admin@yourdomain.com
```

### 第七步：切换 DNS

在域名管理面板，将 A 记录的 IP 从旧服务器改为新服务器。

DNS 生效时间通常 5~30 分钟（TTL 决定），在此期间两台服务器都可能收到请求，需保持旧服务器运行。

### 第八步：验证并下线旧服务器

确认新服务器一切正常后，等待 24 小时（让 DNS 完全生效），再停止旧服务器。

---

## 5. 性能监控

### 系统资源

```bash
# 实时资源使用
htop

# 磁盘使用
df -h
du -sh /var/www/blog/public/uploads/  # 附件大小
du -sh /var/www/blog/prisma/          # 数据库大小

# 内存使用
free -h
```

### 应用性能

```bash
# PM2 资源使用
pm2 monit

# 查看 Node.js 进程内存
pm2 show knowledge-blog
```

### Nginx 访问统计

```bash
# 今日请求总数
awk '{print $1}' /var/log/nginx/access.log | wc -l

# 各状态码统计
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn

# 最多访问的 URL
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20

# 最活跃的 IP
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10
```

### 数据库性能

```bash
# 数据库文件大小
ls -lh /var/www/blog/prisma/dev.db

# 文章总数
sqlite3 /var/www/blog/prisma/dev.db "SELECT count(*) FROM Post;"
```

---

## 6. 升级与更新

### 更新应用代码

```bash
cd /var/www/blog

# 拉取最新代码
git pull origin main

# 安装新依赖（如有）
npm install --legacy-peer-deps

# 更新数据库 Schema（如有）
npx prisma generate
npx prisma db push

# 重新构建
npm run build

# 零停机重载
pm2 reload knowledge-blog
```

### 更新 Docker 服务

```bash
cd /var/www/blog

# 拉取最新镜像
docker compose pull

# 重启服务（会有短暂停机）
docker compose up -d
```

### 更新 Node.js

```bash
# 查看当前版本
node --version

# 安装新版本
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# 重新安装依赖
cd /var/www/blog
rm -rf node_modules
npm install --legacy-peer-deps

# 重新构建并启动
npm run build
pm2 restart knowledge-blog
```

---

## 7. 故障排查

### 博客无法访问

```bash
# 检查 Nginx 状态
systemctl status nginx
nginx -t

# 检查 Next.js 应用状态
pm2 status
pm2 logs knowledge-blog --lines 30

# 检查端口占用
ss -tlnp | grep ':3000\|:80\|:443'

# 检查防火墙
ufw status
```

### 管理后台无法登录

1. 确认 `.env` 中 `ADMIN_EMAIL`、`ADMIN_PASSWORD`、`NEXTAUTH_SECRET` 均已设置
2. 检查 `NEXTAUTH_URL` 与实际访问的域名一致（包括 https://）
3. 清除浏览器 Cookie 后重试
4. 查看日志：`pm2 logs knowledge-blog | grep auth`

### 上传文件报错

```bash
# 检查 uploads 目录权限
ls -la /var/www/blog/public/uploads/

# 修复权限
chown -R $(whoami):$(whoami) /var/www/blog/public/uploads/
chmod 755 /var/www/blog/public/uploads/

# 检查 Nginx 上传大小限制
grep "client_max_body_size" /etc/nginx/sites-available/knowledge-blog
```

### AI 功能无响应

```bash
# 检查 API Key 是否配置
grep "ANTHROPIC_API_KEY" /var/www/blog/.env

# 查看 AI API 相关日志
pm2 logs knowledge-blog | grep -i "ai\|anthropic\|claude"

# 测试 API 连通性
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'
```

### 数据库错误

```bash
# 检查数据库文件
ls -lh /var/www/blog/prisma/dev.db

# 尝试修复 SQLite
sqlite3 /var/www/blog/prisma/dev.db "PRAGMA integrity_check;"

# 重建（不会丢失 content/ 文件）
rm /var/www/blog/prisma/dev.db
cd /var/www/blog
npx prisma db push
# 然后在后台设置页面重新同步内容
```

### 磁盘空间不足

```bash
# 找出大文件
du -sh /var/www/blog/* | sort -h

# 清理 Docker 无用镜像
docker system prune -f

# 清理 PM2 旧日志
pm2 flush

# 清理 apt 缓存
apt autoremove -y && apt clean

# 清理旧数据库备份（保留最近 7 天）
find /var/www/blog/content/_backups/ -name "db-*.db" -mtime +7 -delete
```

### SSL 证书过期

```bash
# 手动更新
certbot renew --force-renewal

# 如果自动续期失败，重新申请
certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# 重载 Nginx
systemctl reload nginx
```

---

## 紧急联系信息

在本地保存以下信息以备不时之需：

```
VPS IP 地址：_______________
SSH 用户名：_______________
SSH 密钥路径：_______________
域名注册商：_______________
域名管理面板：_______________
Claude API Key（末尾4位）：...___
Git 仓库地址：_______________
```
