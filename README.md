# 📚 个人知识库博客（PLAIN MLOG）

> 基于 Next.js 14 + TypeScript 的个人学习笔记站。支持 Markdown / Monaco 编辑、多专题、标签、Meilisearch 搜索、RAG 问答、知识图谱，以及 Docker 一键部署与内容同步。

**当前版本：0.5.0**

---

## 功能亮点

| 模块 | 功能 |
|------|------|
| **写作** | Markdown + GFM + KaTeX + 代码高亮 + `[[双向链接]]` |
| **专题** | 多对多专题、专题内排序 / 分页 / 搜索；旧分类 URL 重定向 |
| **编辑器** | Monaco 分栏预览；标签必填；多专题与封面；上传落盘 `content/` |
| **AI** | 摘要、标签；`/ask` RAG 问答 |
| **图谱** | `/graph`：链接 / 标签 / 时间演化（D3） |
| **搜索** | Meilisearch（专题 `seriesIds` 筛选）或 SQLite 回退；⌃K |
| **管理** | 笔记 CRUD、标签/专题管理、zip 导出、同步与重建索引、GitHub/VPS 发布按钮 |
| **SEO** | sitemap、RSS、OG、JSON-LD |
| **部署** | Docker Compose 或 PM2 + Nginx |

---

## 文档导航

| 文档 | 说明 |
|------|------|
| [**架构与技术栈**](docs/ARCHITECTURE.md) | ★ 技术栈、目录职责、手动改代码速查 |
| [笔记上传手册](笔记上传手册.md) | Frontmatter、配图、`publish.bat`、后台发布 |
| [快速开始](docs/QUICKSTART.md) | 本地 npm / Docker |
| [部署指南](docs/DEPLOYMENT.md) | 生产部署 |
| [配置说明](docs/CONFIGURATION.md) | 环境变量 |
| [写作指南](docs/WRITING.md) | Markdown / 专题 frontmatter |
| [运维手册](docs/OPERATIONS.md) | 备份、排障 |
| [专题优化计划](docs/ADMIN-SERIES-OPTIMIZATION-PLAN.md) | 0.5.0 改造记录 |

---

## 快速体验

### npm

```bash
git clone https://github.com/recreateme/Zoo-Blog.git knowledge-blog
cd knowledge-blog
cp .env.example .env   # 填写 ADMIN_EMAIL / ADMIN_PASSWORD / NEXTAUTH_SECRET
npm install --legacy-peer-deps
npx prisma db push
npm run migrate:series # 若从旧库升级
npm run dev            # http://localhost:3000
```

### Docker（含搜索 + RAG）

```bash
cp .env.example .env
docker compose --profile rag up -d --build
# http://localhost:3000
```

---

## 主要页面

| 路径 | 说明 |
|------|------|
| `/` | 首页：专题 chips + 笔记时间线（`?tag=`） |
| `/series` | 全部专题 |
| `/series/[slug]` | 专题有序列表 + 分页 + `?q=` |
| `/post/[slug]` | 文章：面包屑、专题、TOC、上下篇 |
| `/search` | 全文搜索（标签 / 专题筛选） |
| `/ask` | RAG 问答 |
| `/graph` | 知识图谱 |
| `/admin` | 管理后台（登录 `/admin/login`） |

旧路径 `/{category}`（如 `/ai`）会 **301** 到对应 `/series/{id}`。

---

## 技术栈（摘要）

```
框架    Next.js 14 App Router + TypeScript
样式    Tailwind + CSS Variables（5 主题）
数据    Prisma + SQLite（可迁 PostgreSQL）· Series / PostSeries
认证    NextAuth Credentials（JWT）
搜索    Meilisearch / SQLite
向量    Qdrant + Embedding
编辑器  Monaco
图谱    D3
部署    Docker Compose · scripts/deploy-vps.py
```

完整说明与目录职责见 **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**。

---

## 项目结构（精简）

```
knowledge-blog/
├── app/              # 公开页 · 后台 · API
├── components/       # UI
├── lib/              # 同步 / 搜索 / 专题 / 部署逻辑
├── content/          # Markdown 真相源
├── prisma/           # Schema + SQLite
├── scripts/          # 发布、迁移、重建索引
├── docs/             # 文档
├── docker-compose.yml
└── 笔记上传手册.md
```

---

## 许可证

MIT
