# 🔧 运维手册

本文档涵盖日常运维、Docker 与 PM2 双模式管理、备份恢复、VPS 迁移、性能监控和故障排查。

**当前版本：0.4.2**

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

### Docker 全栈模式

```bash
cd /path/to/knowledge-blog   # 或 /var/www/blog

# 状态
docker compose ps

# 日志
docker compose logs -f app
docker compose logs -f meilisearch --tail 100
docker compose logs -f qdrant --tail 50

# 重启
docker compose restart app
docker compose restart meilisearch

# 停止 / 启动
docker compose down
docker compose --profile rag up -d

# 更新代码后重新构建
git pull origin main
docker compose --profile rag up -d --build

# 进入应用容器 shell
docker compose exec app sh

# 容器内查看 Prisma / 数据库（只读排查）
docker compose exec app ls -la prisma/
```

### PM2 模式（VPS 传统部署）

```bash
pm2 status
pm2 logs knowledge-blog
pm2 logs knowledge-blog --lines 100
pm2 restart knowledge-blog
pm2 reload knowledge-blog    # 零停机重载
pm2 stop knowledge-blog
pm2 monit                     # 实时 CPU/内存
```

### Nginx

```bash
nginx -t
systemctl reload nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Docker 依赖服务（PM2 模式下仅 Meili/Qdrant）

```bash
cd /var/www/blog
docker compose ps
docker compose logs meilisearch
docker compose restart meilisearch
docker compose --profile rag up -d meilisearch qdrant
```

### 数据库

```bash
# Prisma Studio（本机，需端口转发或本地执行）
npx prisma studio    # http://localhost:5555

# SQLite 命令行
sqlite3 prisma/dev.db
.tables
SELECT count(*) FROM Post WHERE status='PUBLISHED';
.quit
```

### 索引维护

```bash
# 搜索全量重建
npm run search:reindex

# 向量全量重建（RAG）
npm run rag:reindex

# 或通过后台「设置」页面按钮 / API（需管理员登录）
# POST /api/search/reindex
# POST /api/vector/reindex
```

### SSL 证书

```bash
certbot certificates
certbot renew
certbot renew --dry-run
```

---

## 2. 备份策略

遵循 **3-2-1 原则**：3 份副本，2 种介质，1 份异地。

### 自动备份（cron）

```bash
crontab -l
# 默认：每天 02:00 执行 scripts/backup.sh
```

备份脚本完成：

1. SQLite 复制到 `content/_backups/db-YYYY-MM-DD.db`
2. `git add -A && git commit`（content 变更）
3. `git push` 到 `GIT_REMOTE_URL`（如已配置）

### 手动备份

```bash
bash scripts/backup.sh
```

### 备份内容清单

| 数据 | 位置 | 备份方式 | 重要性 |
|------|------|----------|--------|
| Markdown 文章 | `content/` | Git | ⭐⭐⭐ 最重要 |
| SQLite 数据库 | `prisma/dev.db` | Git 备份脚本 + 手动 | ⭐⭐ 可从 content 重建 |
| 上传附件 | `public/uploads/` | rsync / rclone | ⭐⭐ 不可从 Markdown 重建 |
| Meilisearch 索引 | Docker volume `meili_data` | 可重建 | ⭐ 可从 DB 重建 |
| Qdrant 向量 | Docker volume `qdrant_data` | 可重建 | ⭐ 可 `rag:reindex` |
| 环境配置 | `.env` | 安全离线保存 | ⭐ 可重新填写 |

### 附件备份

```bash
rsync -avz root@vps:/var/www/blog/public/uploads/ ~/backup/blog-uploads/
```

### Docker volumes 备份（可选）

```bash
docker run --rm -v knowledge-blog_meili_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/meili-backup.tar.gz -C /data .
```

---

## 3. 数据恢复

### 从 Git 恢复文章

```bash
git log --oneline
git checkout <commit> -- content/
```

### 恢复数据库文件

**PM2 模式：**

```bash
pm2 stop knowledge-blog
cp content/_backups/db-2024-01-15.db prisma/dev.db
pm2 start knowledge-blog
```

**Docker 模式：**

```bash
docker compose stop app
cp content/_backups/db-2024-01-15.db prisma/dev.db
docker compose start app
```

### 从 content/ 完全重建数据库

```bash
# 停止应用
docker compose stop app   # 或 pm2 stop knowledge-blog

rm -f prisma/dev.db
npx prisma db push

# 触发同步（任选其一）
curl -X POST http://localhost:3000/api/sync \
  -H "X-Sync-Secret: your-sync-secret"
# 或登录后台「设置 → 从文件系统同步」

# 重建索引
npm run search:reindex
npm run rag:reindex

# 启动应用
docker compose start app   # 或 pm2 start knowledge-blog
```

---

## 4. VPS 迁移

目标停机时间可控制在 **30 分钟以内**。

### 步骤摘要

1. **新 VPS** 安装 Node 20、Docker、Nginx、PM2（或仅 Docker）
2. **克隆代码**：`git clone ... /var/www/blog`
3. **复制 `.env`**：`scp old:/var/www/blog/.env .`
4. **复制数据**：
   ```bash
   scp old:/var/www/blog/prisma/dev.db prisma/
   rsync -avz old:/var/www/blog/public/uploads/ public/uploads/
   rsync -avz old:/var/www/blog/content/ content/
   ```
5. **构建启动**：
   - Docker：`docker compose --profile rag up -d --build`
   - PM2：`npm ci && npm run build && pm2 start ...`
6. **Nginx + SSL** + **切换 DNS A 记录**
7. 验证后 24h 下线旧机

### Docker volumes 迁移

Meilisearch / Qdrant 数据可不复用，在新机执行内容同步 + `search:reindex` + `rag:reindex` 即可。

---

## 5. 性能监控

### 系统资源

```bash
htop
df -h
du -sh content/ public/uploads/ prisma/
free -h
```

### Docker 资源

```bash
docker stats
docker system df
```

### 应用

```bash
pm2 show knowledge-blog          # PM2 模式
docker compose logs app --tail 20
```

### Nginx 统计

```bash
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20
```

---

## 6. 升级与更新

### Docker 方式

```bash
cd /var/www/blog
git pull origin main
docker compose --profile rag up -d --build
docker compose logs app --tail 30    # 确认启动无报错
```

应用容器启动时自动 `prisma db push`。

### PM2 方式

```bash
git pull origin main
npm ci --legacy-peer-deps
npx prisma generate && npx prisma db push
NODE_OPTIONS="--max-old-space-size=2048" npm run build
pm2 reload knowledge-blog
```

### 更新 Docker 依赖镜像

```bash
docker compose pull meilisearch qdrant
docker compose --profile rag up -d
```

### 版本升级注意（0.4.x）

- 新增 `/graph` 路由与 `GET /api/graph`
- `unstable_cache` 日期修复：升级后若首页报错，务必重新 `build`
- 知识图谱筛选为纯前端，无数据库迁移

---

## 7. 故障排查

### 博客无法访问

```bash
# Docker
docker compose ps
docker compose logs app --tail 50

# PM2
pm2 status && pm2 logs knowledge-blog --lines 30

# 网络
ss -tlnp | grep ':3000\|:80\|:443'
curl -I http://localhost:3000/
```

### 首页「页面遇到了未预期的错误」

```bash
docker compose logs app --tail 80 | grep -i error
```

| 日志关键词 | 原因 | 处理 |
|------------|------|------|
| `getFullYear is not a function` | 缓存日期未还原 | 升级到 0.4.2+ 并重新 build |
| `Can't reach database` | prisma 目录权限/挂载 | 检查 volume 与文件权限 |
| `Meilisearch` / `fetch failed` | 搜索服务未启动 | `docker compose up -d meilisearch` |

### 管理后台无法登录

1. 确认 `.env` 中 `ADMIN_EMAIL`、`ADMIN_PASSWORD`、`NEXTAUTH_SECRET` 拼写正确，**引号成对**
2. 容器内核对：`docker compose exec app printenv ADMIN_EMAIL`（不应带多余 `"`）
3. `NEXTAUTH_URL` 与浏览器地址栏一致（含协议与端口，如 `http://IP:3000`）
4. 若库中已有同邮箱 `User`，须使用该用户的 bcrypt 密码，或删掉该行后改回 env 账号
5. 清除站点 Cookie 后重试；查看 `docker compose logs app --tail=100`

### 搜索无结果 / 体验差

```bash
docker compose ps meilisearch
curl http://127.0.0.1:7700/health
npm run search:reindex
```

确认 `.env` 中 `MEILISEARCH_API_KEY` 与 compose `MEILI_MASTER_KEY` 一致。

### RAG /ask 无响应

1. Qdrant 是否运行：`docker compose ps qdrant`
2. Embedding / LLM API Key 是否配置
3. 是否已执行 `npm run rag:reindex`
4. 默认需登录；公开访问设 `ASK_PUBLIC=true`（注意 API 费用）

### 知识图谱为空

- **笔记链接**：需已发布笔记且存在 `[[双向链接]]`，并已同步（生成 `PostLink`）
- **标签关联**：笔记需有 tags
- **时间演化**：需 `publishedAt` 字段
- 筛选过严时点击「清除」重置

### 上传失败

```bash
ls -la public/uploads/
chmod 755 public/uploads/
grep client_max_body_size /etc/nginx/sites-available/knowledge-blog
```

### 磁盘不足

```bash
du -sh * | sort -h
docker system prune -f
pm2 flush
find content/_backups/ -name "db-*.db" -mtime +7 -delete
```

### SSL 过期

```bash
certbot renew --force-renewal
systemctl reload nginx
```

---

## 紧急信息清单

建议在密码管理器中保存：

```
VPS IP：_______________
部署方式：Docker / PM2
域名与 DNS 面板：_______________
Git 仓库：_______________
.env 备份位置：_______________
API Key 末四位：...___
```
