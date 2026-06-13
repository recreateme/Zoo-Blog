# ⚙️ 配置说明

项目所有配置通过根目录 `.env` 文件管理。本文档逐一说明每个配置项的含义、默认值和注意事项。

---

## 配置文件

```bash
cp .env.example .env   # 从模板创建配置文件
```

`.env` 文件**不会**提交到 Git（已加入 `.gitignore`）。

---

## 数据库

```bash
# SQLite（默认，开发和小型生产均可用）
DATABASE_URL="file:./prisma/dev.db"

# PostgreSQL（数据量大或需要并发写入时迁移）
# DATABASE_URL="postgresql://user:password@localhost:5432/knowledge_blog"
```

**切换到 PostgreSQL：**
1. 修改 `prisma/schema.prisma` 中的 `provider = "postgresql"`
2. 更新 `DATABASE_URL`
3. 执行 `npx prisma migrate dev`

由于使用了 Prisma，切换数据库**不需要修改任何业务代码**。

---

## 认证

```bash
# 后台访问的 URL 前缀，必须与实际部署域名一致
NEXTAUTH_URL="http://localhost:3000"          # 开发
NEXTAUTH_URL="https://yourdomain.com"         # 生产

# JWT 签名密钥，随机字符串，至少 32 位
# 生成命令：openssl rand -base64 32
NEXTAUTH_SECRET="your-random-secret-key"

# 管理员账号（首次使用，或数据库中无用户时的备用登录）
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="your-secure-password"
```

> **安全提示**：生产环境务必使用强密码和随机 Secret。一旦设置好数据库中的用户账号，可以将 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 留空。

---

## AI 服务

### 提供商选择

```bash
# 当前使用的 LLM 提供商
# 可选值：claude | openai | deepseek | ollama
LLM_PROVIDER="claude"
```

### Claude（Anthropic）

```bash
ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxxxxxxxxxx"
```

获取 API Key：https://console.anthropic.com/

计费参考：摘要和标签生成使用 `claude-haiku`，每篇文章约消耗 $0.001~$0.003。

### OpenAI

```bash
LLM_PROVIDER="openai"
OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxxxx"
OPENAI_BASE_URL="https://api.openai.com/v1"   # 默认值，可改为代理地址
OPENAI_MODEL="gpt-4o-mini"                    # 默认模型
```

### DeepSeek

```bash
LLM_PROVIDER="deepseek"
DEEPSEEK_API_KEY="sk-xxxxxxxxxxxxxxxxxxxx"
```

DeepSeek 兼容 OpenAI API 格式，价格更低。

### Ollama（本地模型）

```bash
LLM_PROVIDER="ollama"
OLLAMA_BASE_URL="http://localhost:11434"    # Ollama 服务地址
OLLAMA_MODEL="qwen2.5:7b"                  # 使用的模型名
```

需要先在本机或服务器安装并运行 Ollama：
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:7b
```

---

## 文件存储

```bash
# 存储提供商：local | minio | s3 | oss
STORAGE_PROVIDER="local"

# 本地存储路径（相对于项目根目录）
UPLOAD_DIR="./public/uploads"

# 单文件最大大小（字节）
MAX_FILE_SIZE="10485760"   # 10MB
```

### MinIO（自托管对象存储）

```bash
STORAGE_PROVIDER="minio"
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="knowledge-blog"
```

MinIO 部署：
```bash
docker run -d \
  -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  -v ~/minio-data:/data \
  minio/minio server /data --console-address ":9001"
```

### AWS S3

```bash
STORAGE_PROVIDER="s3"
AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
AWS_REGION="us-east-1"
S3_BUCKET="knowledge-blog"
```

---

## 搜索（Phase 2）

Phase 1 默认使用 SQLite `contains` 模糊搜索。

接入 Meilisearch（推荐）：

```bash
MEILISEARCH_HOST="http://localhost:7700"
MEILISEARCH_API_KEY="local-dev-master-key-16b"   # 与 docker-compose 中 MEILI_MASTER_KEY 一致
```

启动 Meilisearch 后，在后台「设置 → 从文件系统同步」会重建搜索索引。后台编辑/删除文章也会自动更新索引。未配置时自动回退 SQLite。

---

## 向量数据库（Phase 3 RAG）

```bash
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=""   # 本地部署可留空
```

启动 Qdrant：
```bash
docker compose up -d qdrant
```

---

## 内容目录

```bash
# Markdown 文件目录（相对于项目根目录）
CONTENT_DIR="./content"
```

---

## 站点信息

以 `NEXT_PUBLIC_` 开头的变量会暴露到浏览器端，其余变量仅在服务端可用。

```bash
# 完整站点 URL（用于 sitemap、RSS、OpenGraph）
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"

# 站点名称（显示在标题栏、导航栏）
NEXT_PUBLIC_SITE_NAME="个人知识库"

# 站点描述（用于 SEO meta description）
NEXT_PUBLIC_SITE_DESCRIPTION="我的学习笔记与知识积累"

# 作者名（用于 RSS、版权信息）
NEXT_PUBLIC_SITE_AUTHOR="Your Name"
```

---

## Git 备份（可选）

```bash
# 备份推送的 Git 远程仓库地址
GIT_REMOTE_URL="git@github.com:yourname/knowledge-blog-content.git"
```

如果设置了此项，备份脚本会在每次执行时将内容推送到远程仓库。

---

## 配置优先级

当同一配置项在多处定义时，优先级为：

```
.env.local（不提交）> .env（提交）> .env.example（模板）
```

生产环境推荐只维护 `.env` 文件，本地开发使用 `.env.local` 覆盖部分配置。

---

## 最小必要配置汇总

| 场景 | 必须配置 |
|------|----------|
| 本地开发 | `ADMIN_EMAIL` + `ADMIN_PASSWORD` + `NEXTAUTH_SECRET` |
| 生产部署 | 以上三项 + `NEXTAUTH_URL` + `NEXT_PUBLIC_SITE_URL` |
| 启用 AI | 以上 + `ANTHROPIC_API_KEY`（或对应提供商的 Key） |
| 启用备份 | 以上 + `GIT_REMOTE_URL` |
