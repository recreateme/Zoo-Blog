# 📚 个人知识库博客（PLAIN MLOG）

> 基于 Next.js 14 + TypeScript 构建的个人学习笔记发布平台。支持 Markdown 写作、Monaco 在线编辑、AI 辅助摘要与标签、RAG 知识问答、知识图谱可视化、多分类管理、本地笔记 rsync 同步，可 Docker 一键部署或 PM2 + Nginx 上 VPS。

**当前版本：0.4.3**

---

## 功能亮点

| 模块 | 功能 |
|------|------|
| **写作** | Markdown + GFM + 数学公式 KaTeX + 代码高亮 Shiki + `[[双向链接]]` |
| **编辑器** | Monaco Editor 在线编辑，实时分栏预览，Ctrl+S 保存，随主题切换亮/暗 |
| **AI 辅助** | 一键生成摘要、智能打标签、阅读时长估算 |
| **RAG 问答** | `/ask` 页面：向量检索笔记片段 + LLM 综合回答，附来源引用 |
| **知识图谱** | `/graph`：D3 力导向图，笔记链接 / 标签关联 / 时间演化三视图，支持分类·专题·孤立节点筛选 |
| **内容管理** | 草稿/发布状态、多级分类、系列教程、标签系统、附件管理 |
| **展示** | 时间线首页、宽版阅读页（正文主栏 + 右侧 sticky 目录）、阅读进度、全文搜索、⌃K 命令搜索 |
| **同步** | 本地文件夹 rsync、Git 备份、一键内容索引与向量重建 |
| **SEO** | sitemap.xml、RSS Feed、Open Graph、JSON-LD |
| **部署** | Docker Compose 全栈 **或** PM2 + Nginx + Let's Encrypt |

---

## 文档导航

| 文档 | 说明 |
|------|------|
| [**笔记上传手册**](笔记上传手册.md) | Frontmatter、配图、一键 `publish.bat` 推送 GitHub 并更新 VPS |
| [快速开始](docs/QUICKSTART.md) | 5 分钟本地运行（npm 或 Docker） |
| [部署指南](docs/DEPLOYMENT.md) | Docker 全栈 / VPS 生产环境完整部署 |
| [配置说明](docs/CONFIGURATION.md) | 所有环境变量详解 |
| [写作指南](docs/WRITING.md) | Markdown 规范、双向链接与本地同步工作流 |
| [架构说明](docs/ARCHITECTURE.md) | 技术架构、数据流与项目结构 |
| [运维手册](docs/OPERATIONS.md) | 备份、监控、迁移与故障排查 |

---

## 快速体验

### 方式 A：npm 开发模式

```bash
git clone https://github.com/recreateme/Zoo-Blog.git knowledge-blog
cd knowledge-blog
cp .env.example .env   # 填写 ADMIN_EMAIL / ADMIN_PASSWORD / NEXTAUTH_SECRET
npm install --legacy-peer-deps
npx prisma db push
npm run dev            # http://localhost:3000
```

### 方式 B：Docker 全栈（推荐本地完整功能）

```bash
cp .env.example .env   # 配置管理员账号与 API Key
docker compose --profile rag up -d --build
# http://localhost:3000
```

Docker 会同时启动 **Next.js 应用**、**Meilisearch**（全文搜索）、**Qdrant**（RAG 向量库）。详见 [部署指南 · Docker 全栈](docs/DEPLOYMENT.md#docker-全栈部署)。

---

## 主要页面

| 路径 | 说明 |
|------|------|
| `/` | 首页「所有内容」：Hero 统计 + 按月时间线 |
| `/[category]` | 分类页（如 `/ai`） |
| `/post/[slug]` | 文章详情：TOC、系列导航、相关笔记 |
| `/search` | 全文搜索（Meilisearch 或 SQLite 回退） |
| `/ask` | RAG 知识问答 |
| `/graph` | 知识图谱（链接 / 标签 / 时间演化） |
| `/admin` | 管理后台 |

---

## 技术栈

```
框架    Next.js 14 App Router + TypeScript
样式    Tailwind CSS + CSS Variables 设计系统（5 套主题）
数据库  Prisma ORM + SQLite（可无缝迁移 PostgreSQL）
认证    NextAuth.js（邮箱密码 + JWT Session）
AI      Claude / OpenAI / DeepSeek / Ollama / OpenRouter（可切换）
编辑器  Monaco Editor（VS Code 同款内核）
搜索    Meilisearch 全文搜索（未配置时回退 SQLite）
向量    Qdrant + OpenAI/Ollama Embedding（RAG）
图谱    D3.js 力导向布局 + lib/graph-data.ts
部署    Docker Compose 或 Nginx + PM2 + Let's Encrypt
```

---

## 项目结构（精简）

```
knowledge-blog/
├── app/              # Next.js App Router（公开页 / 后台 / API）
├── components/       # React 组件（含 graph/、search/、ask/）
├── lib/              # 业务逻辑（markdown、search、vector、graph-data…）
├── content/          # Markdown 内容真相源（Git 管理）
├── prisma/           # Schema + SQLite 数据库文件
├── docker-compose.yml
├── Dockerfile
└── docs/             # 项目文档
```

完整目录说明见 [架构说明](docs/ARCHITECTURE.md)。

---

## 许可证

MIT
