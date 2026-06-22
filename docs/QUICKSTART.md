# ⚡ 快速开始

本文档帮助你在 **5 分钟内**在本地运行项目。提供两种路径：**npm 开发模式**（轻量、热更新）和 **Docker 全栈**（含搜索与 RAG，接近生产环境）。

---

## 前置要求

| 工具 | 版本要求 | 检查命令 | 何时需要 |
|------|----------|----------|----------|
| Node.js | ≥ 20.x | `node --version` | npm 方式必选 |
| npm | ≥ 10.x | `npm --version` | npm 方式必选 |
| Git | 任意 | `git --version` | 克隆代码 |
| Docker | ≥ 24.x | `docker --version` | Docker 方式必选 |
| Docker Compose | v2 | `docker compose version` | Docker 方式必选 |

---

## 路径一：npm 开发模式

适合日常改代码、调试 UI，不强制依赖 Meilisearch / Qdrant（搜索回退 SQLite，RAG 需另行启动 Qdrant）。

### 1. 获取代码

```bash
git clone https://github.com/recreateme/Zoo-Blog.git knowledge-blog
cd knowledge-blog
```

### 2. 安装依赖

```bash
npm install --legacy-peer-deps
```

> 使用 `--legacy-peer-deps` 是因为部分包的 peer dependency 声明较旧，不影响实际运行。

### 3. 配置环境变量

```bash
cp .env.example .env
```

用任意编辑器打开 `.env`，**最少只需要修改以下 3 项**即可本地运行：

```bash
# 管理员账号（登录后台用）
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="your-password-here"

# NextAuth 密钥（随机字符串即可，至少 32 位）
NEXTAUTH_SECRET="any-random-string-at-least-32-characters"

# Claude API（可选，不填 AI 功能不可用，其余功能正常）
ANTHROPIC_API_KEY="sk-ant-xxxx"
```

其他配置保持默认值即可。

### 4. 初始化数据库

```bash
npx prisma db push
```

这会在 `prisma/dev.db` 创建 SQLite 数据库，并建好所有表结构。

### 5. 启动开发服务器

```bash
npm run dev
```

启动成功后访问：

| 地址 | 说明 |
|------|------|
| http://localhost:3000 | 博客首页 |
| http://localhost:3000/admin/login | 管理后台登录 |
| http://localhost:3000/search | 全文搜索 |
| http://localhost:3000/ask | RAG 问答（需 Qdrant + Embedding） |
| http://localhost:3000/graph | 知识图谱 |

### 6. （可选）启动搜索与向量服务

若需要完整搜索与 RAG 体验，另开终端：

```bash
# 仅 Meilisearch
docker compose up -d meilisearch

# Meilisearch + Qdrant（RAG）
docker compose --profile rag up -d meilisearch qdrant
```

并在 `.env` 中确认：

```bash
MEILISEARCH_HOST="http://localhost:7700"
MEILISEARCH_API_KEY="local-dev-master-key-16b"
QDRANT_URL="http://localhost:6333"
```

---

## 路径二：Docker 全栈

一条命令启动应用 + Meilisearch + Qdrant，**无需本机安装 Node.js**。适合验收完整功能或本地模拟生产环境。

### 1. 获取代码并配置

```bash
git clone https://github.com/recreateme/Zoo-Blog.git knowledge-blog
cd knowledge-blog
cp .env.example .env
# 编辑 .env：ADMIN_EMAIL、ADMIN_PASSWORD、NEXTAUTH_SECRET、ANTHROPIC_API_KEY 等
```

> **注意**：`.env` 中 `MEILISEARCH_HOST` 可保持 `http://localhost:7700`（供本机脚本使用）。`docker-compose.yml` 会在 **app 容器内**自动覆盖为 `http://meilisearch:7700` 和 `http://qdrant:6333`，无需手动改。

### 2. 构建并启动

```bash
docker compose --profile rag up -d --build
```

### 3. 验证

```bash
docker compose ps
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/
```

浏览器打开 http://localhost:3000 。

### 4. 常用 Docker 命令

```bash
docker compose logs -f app          # 查看应用日志
docker compose restart app          # 重启应用
docker compose down                 # 停止所有服务
docker compose --profile rag up -d --build   # 代码更新后重新构建
```

---

## 写第一篇笔记

### 方式 A：在线编辑器

1. 打开 http://localhost:3000/admin/login
2. 输入 `.env` 中的邮箱和密码
3. 点击「**新建笔记**」
4. 填写标题、选择分类，在 Monaco 编辑器中写 Markdown
5. 点击「**AI 生成**」自动生成摘要和标签（需要 API Key）
6. 将状态改为「**发布**」，点击「**保存**」

### 方式 B：同步本地 Markdown

将 Markdown 放入 `content/` 对应分类目录：

```
content/
├── ai/
├── web-dev/
├── huawei-datacom/
└── ...
```

文件需包含 frontmatter，详见 [写作指南](WRITING.md#1-frontmatter-规范)。

然后在后台「**设置 → 从文件系统同步**」点击同步，内容即导入数据库并更新搜索/向量索引。

### 方式 C：双向链接与知识图谱

在正文中使用 `[[其他笔记标题]]` 或 `[[slug]]` 语法。同步后：

- 文章页渲染为可点击链接
- `/graph`「笔记链接」视图展示节点关系
- 「时间演化」视图按月累积展示网络增长

---

## 常见问题

**Q: `prisma db push` 报错 "failed to fetch"？**

```bash
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma db push
```

**Q: 访问 /admin 一直跳转登录页？**

检查 `NEXTAUTH_SECRET` 是否已设置且不少于 32 个字符。

**Q: Docker 首页报「页面遇到了未预期的错误」？**

查看日志：`docker compose logs app --tail 50`。常见原因是数据库或缓存相关，确保 `prisma/` 目录已挂载且可写。若刚升级版本，执行 `docker compose up -d --build` 重新构建。

**Q: AI / RAG 无响应？**

- AI 摘要/标签：确认 `ANTHROPIC_API_KEY`（或对应 Provider Key）
- RAG 问答：确认 Qdrant 已启动（`docker compose ps`），并在后台执行向量重建

**Q: 上传图片后显示不出来？**

```bash
mkdir -p public/uploads
# Docker 方式下 uploads 已通过 volume 挂载，确保目录存在
```

**Q: 端口 3000 被占用？**

```bash
# npm 开发模式会自动尝试 3001、3002…
# 或修改 docker-compose.yml 中 ports 为 "3002:3000"
```

---

## 下一步

- [部署指南](DEPLOYMENT.md) — 发布到公网（Docker 或 VPS）
- [配置说明](CONFIGURATION.md) — 全部环境变量
- [写作指南](WRITING.md) — Markdown 扩展与同步脚本
- [知识图谱](ARCHITECTURE.md#知识图谱-04x) — 三视图与筛选逻辑
