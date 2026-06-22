# ⚙️ 配置说明

项目所有配置通过根目录 `.env` 文件管理。本文档逐一说明每个配置项的含义、默认值、Docker 与 PM2 部署下的差异，以及注意事项。

**模板文件：** `cp .env.example .env`

`.env` **不会**提交到 Git（已加入 `.gitignore`）。生产环境勿将密钥写入代码仓库。

---

## 配置优先级

```
.env.local（不提交）> .env > docker-compose environment 覆盖 > .env.example（仅模板）
```

本地开发可用 `.env.local` 覆盖部分项。Docker 部署时，`docker-compose.yml` 会为 `app` 容器覆盖以下变量（优先级高于 `.env` 文件）：

| 变量 | 容器内值 | 说明 |
|------|----------|------|
| `MEILISEARCH_HOST` | `http://meilisearch:7700` | 勿在 `.env` 写容器名，否则 `npm run dev` 会失败 |
| `QDRANT_URL` | `http://qdrant:6333` | 同上 |

`.env` 中保持 `localhost` 即可同时兼容本机开发与 Docker。

---

## 最小必要配置

| 场景 | 必须配置 |
|------|----------|
| 本地开发 | `ADMIN_EMAIL` + `ADMIN_PASSWORD` + `NEXTAUTH_SECRET` |
| 生产部署 | 以上 + `NEXTAUTH_URL` + `NEXT_PUBLIC_SITE_URL` |
| 全文搜索 | + `MEILISEARCH_HOST` + `MEILISEARCH_API_KEY`（与 compose 中 `MEILI_MASTER_KEY` 一致） |
| AI 摘要/标签 | + 对应 Provider 的 API Key |
| RAG 问答 | + `QDRANT_URL` + Embedding 相关 + LLM Provider |
| rsync 自动同步 | + `SYNC_SECRET`（与本地 `.sync.env` 一致） |

---

## 数据库

```bash
# SQLite（默认，开发和小型生产均可用）
DATABASE_URL="file:./prisma/dev.db"

# 生产 VPS（PM2 模式，绝对路径更稳妥）
# DATABASE_URL="file:/var/www/blog/prisma/prod.db"

# PostgreSQL（数据量大或需要并发写入时迁移）
# DATABASE_URL="postgresql://user:password@localhost:5432/knowledge_blog"
```

**切换到 PostgreSQL：**

1. 修改 `prisma/schema.prisma` 中 `provider = "postgresql"`
2. 更新 `DATABASE_URL`
3. 执行 `npx prisma migrate dev`

使用 Prisma，切换数据库**不需要修改业务代码**。

Docker 方式下 `prisma/` 目录挂载到容器，`DATABASE_URL` 保持 `file:./dev.db` 即可（相对容器工作目录 `/app`）。

---

## 认证

```bash
NEXTAUTH_URL="http://localhost:3000"          # 开发
NEXTAUTH_URL="https://yourdomain.com"         # 生产（必须与浏览器地址栏一致，含 https）

NEXTAUTH_SECRET="your-random-secret-key"      # openssl rand -base64 32

ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="your-secure-password"
```

> **安全提示**：生产环境使用强密码和随机 Secret。数据库中已有用户后，可将 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 留空。

---

## 站点信息（品牌化）

默认站点名 **PLAIN MLOG**，首页导航为「所有内容」，逻辑集中在 `lib/site.ts`。

```bash
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"
NEXT_PUBLIC_SITE_NAME="PLAIN MLOG"
NEXT_PUBLIC_SITE_DESCRIPTION="学习笔记与技术沉淀"
NEXT_PUBLIC_SITE_AUTHOR="Your Name"

# 文章页「编辑此页」链到 GitHub 仓库中的 Markdown（可选）
# NEXT_PUBLIC_CONTENT_GITHUB_URL="https://github.com/user/repo/blob/main/content"
```

以 `NEXT_PUBLIC_` 开头的变量会暴露到浏览器，用于标题、RSS、Open Graph 等。

---

## AI 服务

### 提供商选择

```bash
LLM_PROVIDER="claude"   # claude | openai | deepseek | ollama | openrouter
```

| Provider | 主要变量 | 用途 |
|----------|----------|------|
| Claude | `ANTHROPIC_API_KEY` | 摘要、标签、RAG 回答 |
| OpenAI | `OPENAI_API_KEY`, `OPENAI_MODEL` | 同上 |
| OpenRouter | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | 一个 Key 调多家模型 |
| DeepSeek | `DEEPSEEK_API_KEY` | 低价 OpenAI 兼容 |
| Ollama | `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | 本地离线模型 |

### OpenRouter 示例（LLM + Embedding）

```bash
LLM_PROVIDER="openrouter"
OPENROUTER_API_KEY="sk-or-v1-..."
OPENROUTER_MODEL="anthropic/claude-3.5-sonnet"

EMBEDDING_PROVIDER="openai"
EMBEDDING_API_KEY="sk-or-v1-..."                    # 可与 OPENROUTER_API_KEY 相同
EMBEDDING_BASE_URL="https://openrouter.ai/api/v1"
EMBEDDING_MODEL="openai/text-embedding-3-small"
EMBEDDING_DIMENSION="1536"
```

### Ollama 本地

```bash
LLM_PROVIDER="ollama"
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="qwen2.5:7b"

EMBEDDING_PROVIDER="ollama"
EMBEDDING_MODEL="nomic-embed-text"
EMBEDDING_DIMENSION="768"
```

---

## 文件存储

```bash
STORAGE_PROVIDER="local"      # local | minio | s3
UPLOAD_DIR="./public/uploads"
MAX_FILE_SIZE="10485760"      # 10MB
```

### MinIO（Docker profile: storage）

```bash
STORAGE_PROVIDER="minio"
MINIO_ENDPOINT="localhost"    # Docker 内改为 minio
MINIO_PORT="9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="knowledge-blog"
MINIO_PUBLIC_URL="http://localhost:9000/knowledge-blog"
```

```bash
docker compose --profile storage up -d minio
# 控制台 http://localhost:9001
```

---

## 搜索（Meilisearch）

未配置时自动回退 SQLite `contains` 模糊搜索（中文体验较弱）。

```bash
MEILISEARCH_HOST="http://localhost:7700"
MEILISEARCH_API_KEY="local-dev-master-key-16b"
```

`docker-compose.yml` 中：

```yaml
MEILI_MASTER_KEY=${MEILISEARCH_API_KEY:-local-dev-master-key-16b}
```

**索引维护：**

- 后台「设置 → 从文件系统同步」会重建搜索索引
- 后台编辑/删除文章自动增量更新
- CLI：`npm run search:reindex`

---

## 向量数据库与 RAG（Qdrant）

```bash
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=""             # 本地可留空

# 问答接口默认需登录
ASK_PUBLIC="false"

# 向量检索最低相关度（Cosine 0~1）
VECTOR_MIN_SCORE="0.35"
```

启动 Qdrant：

```bash
docker compose --profile rag up -d qdrant
```

**Embedding：**

```bash
EMBEDDING_PROVIDER="openai"
EMBEDDING_MODEL="text-embedding-3-small"
EMBEDDING_DIMENSION="1536"
# EMBEDDING_API_KEY=""        # 默认可复用 OPENAI_API_KEY 或 OPENROUTER_API_KEY
# EMBEDDING_BASE_URL=""
```

**向量重建：**

```bash
npm run rag:reindex
# 或 POST /api/vector/reindex（需管理员登录）
```

切换 `EMBEDDING_MODEL` / `EMBEDDING_DIMENSION` 后必须全量重建索引。

同步与后台 CRUD 会自动增量更新向量；失败信息写入 `indexErrors` 字段。

---

## 内容同步

```bash
CONTENT_DIR="./content"

# rsync 脚本调用 /api/sync 的共享密钥（≥32 字符随机串）
SYNC_SECRET="your-random-sync-secret-min-32-chars"
```

本地 `.sync.env`（不提交）需配置相同 `SYNC_SECRET`。并发同步冲突时 API 返回 **409**。

可选附件同步：`.sync.env` 中 `SYNC_UPLOADS=true`，并配置 `LOCAL_UPLOADS_DIR` / `VPS_UPLOADS_DIR`。

脚本路径：

- Linux/macOS：`scripts/sync-local.sh`
- Windows：`scripts/sync-local.ps1`

---

## Git 备份（可选）

```bash
GIT_REMOTE_URL="git@github.com:yourname/knowledge-blog-content.git"
```

`scripts/backup.sh` 会将 `content/` 与数据库备份提交并 push（如已配置远程）。

---

## Docker Compose 环境变量对照

| 服务 | 镜像 | Profile | 端口映射 |
|------|------|---------|----------|
| app | 自建 Dockerfile | 默认 | `3000:3000` |
| meilisearch | getmeili/meilisearch:v1.9 | 默认 | `127.0.0.1:7700:7700` |
| qdrant | qdrant/qdrant:v1.11.0 | `rag` | `127.0.0.1:6333:6333` |
| minio | minio/minio:latest | `storage` | `9000`, `9001` |

**常用启动组合：**

```bash
docker compose up -d --build                           # app + meilisearch
docker compose --profile rag up -d --build             # + qdrant
docker compose --profile storage --profile rag up -d   # + minio
```

---

## 知识图谱相关

图谱数据来自已发布笔记，**无需单独配置**。相关 API：

```
GET /api/graph?view=links     # 笔记双向链接（默认）
GET /api/graph?view=tags      # 标签共现
GET /api/graph?view=timeline  # 按月累积时间演化
```

筛选在客户端完成（分类 / 专题 / 隐藏孤立节点），不持久化到 URL（0.4.2）。

图谱依赖：

- **笔记链接视图**：`PostLink` 表（由 `[[wiki links]]` 同步生成）
- **标签视图**：笔记 `tags` 字段共现
- **时间演化**：`publishedAt` 按月切片

---

## 主题

前台支持 5 套主题（`classic` / `dark` / `eye` / `parchment` / `ink`），用户选择保存在浏览器 `localStorage`（`knowledge-blog-theme`）。后台 Monaco 编辑器随 `data-theme` 切换 `vs` / `vs-dark`。

无需环境变量配置。

---

## 故障排查速查

| 现象 | 检查项 |
|------|--------|
| 搜索无结果 | Meilisearch 是否运行；后台是否重建索引 |
| /ask 报错 | Qdrant、Embedding API、LLM API；`ASK_PUBLIC` 与登录状态 |
| Docker 内搜索失败 | `MEILISEARCH_HOST` 是否被 compose 覆盖为 `meilisearch:7700` |
| 同步 401/403 | `SYNC_SECRET` 是否与 `.sync.env` 一致 |
| 图谱为空 | 是否有已发布笔记；链接视图需 `[[双向链接]]` 且已同步 |

更多见 [运维手册](OPERATIONS.md)。
