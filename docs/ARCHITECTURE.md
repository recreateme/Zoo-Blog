# 🏗️ 架构说明

本文档介绍项目的技术架构、数据流、关键设计决策，以及 0.4.x 知识图谱模块。

**当前版本：0.4.2**

---

## 系统架构总览

### Docker 全栈（推荐本地 / 单机）

```
┌─────────────────────────────────────────────────────────────┐
│  用户浏览器                                                  │
└───────────────────────────┬─────────────────────────────────┘
                            │ :3000 或 Nginx :443
┌───────────────────────────▼─────────────────────────────────┐
│  Docker Network: blog-net                                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  app（knowledge-blog-app）                            │   │
│  │  Next.js 14 standalone · prisma db push · server.js   │   │
│  │  volumes: content/ · prisma/ · public/uploads/       │   │
│  └────────┬─────────────────────┬────────────────────────┘   │
│           │                     │                            │
│  ┌────────▼────────┐   ┌───────▼────────┐   ┌────────────┐ │
│  │  meilisearch    │   │  qdrant        │   │  minio     │ │
│  │  :7700 全文搜索  │   │  :6333 RAG    │   │  (可选)    │ │
│  └─────────────────┘   └────────────────┘   └────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### VPS 生产（PM2 + Nginx）

```
浏览器 ──HTTPS──► Nginx ──► Next.js (PM2 :3000)
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
                 SQLite   content/   uploads/
                    │
         Docker: Meilisearch + Qdrant (localhost)
```

---

## 前台功能模块

| 模块 | 路径 | 核心库 | 说明 |
|------|------|--------|------|
| 首页时间线 | `/` | `cached-queries`, `HomeHero` | 按月分组，ISR 缓存 |
| 分类页 | `/[category]` | `categories.ts` | SSG 预渲染分类路由 |
| 文章阅读 | `/post/[slug]` | `markdown.ts`, `wiki-links` | SSR + TOC + 系列导航 |
| 全文搜索 | `/search` | `search-index.ts` | Meilisearch / SQLite 回退 |
| RAG 问答 | `/ask` | `vector-index`, `embeddings` | Qdrant 检索 + LLM |
| 知识图谱 | `/graph` | `graph-data.ts`, D3 | 三视图 + 筛选 |
| 管理后台 | `/admin/*` | Monaco, NextAuth | RBAC 中间件保护 |

---

## 知识图谱（0.4.x）

### 数据流

```
已发布 Post + PostLink + tags
        │
        ▼
  lib/graph-data.ts
  ├─ buildLinkGraphFromData()      → view=links
  ├─ buildTagGraphFromPosts()      → view=tags
  └─ buildTimelineGraphFromData()  → view=timeline
        │
        ▼
  GET /api/graph?view=...
        │
        ▼
  KnowledgeGraph.tsx (D3 force simulation)
        │
        ├─ filterGraphByTimelineStep()   # 时间轴切片
        └─ applyGraphFilters()           # 分类/专题/孤立节点
```

### 节点类型

| kind | 来源 | 筛选字段 |
|------|------|----------|
| `post` | 笔记 | `category`, `series` |
| `tag` | 标签共现 | `categories[]`, `seriesList[]` |

### 三视图

1. **笔记链接** — `PostLink` 双向边，展示 `[[wiki link]]` 网络
2. **标签关联** — 同一篇笔记内标签两两共现
3. **时间演化** — 按 `publishedAt` 月份累积节点与边，支持滑块与播放动画

### 筛选（0.4.2）

`GraphFilters`：`category?`, `series?`, `hideIsolated?`

- 在时间轴切片**之后**应用
- `hideIsolated`：剔除过滤后无任何连边的节点
- 统计栏显示筛选后的节点/边数

---

## 目录结构详解

```
knowledge-blog/
│
├── app/
│   ├── (public)/
│   │   ├── page.tsx              # 首页时间线
│   │   ├── [category]/page.tsx   # 分类页
│   │   ├── post/[slug]/page.tsx  # 文章详情
│   │   ├── search/               # 搜索（SearchClient）
│   │   ├── ask/                  # RAG 问答
│   │   └── graph/                # 知识图谱（GraphClient + KnowledgeGraph）
│   │
│   ├── admin/                    # 后台（middleware 保护）
│   │   ├── editor/               # Monaco 编辑器
│   │   ├── posts/                # 笔记列表
│   │   ├── files/                # 附件管理
│   │   └── settings/             # 同步 / 索引 / 系统设置
│   │
│   ├── api/
│   │   ├── posts/                # CRUD
│   │   ├── ai/summarize|tags     # AI 辅助
│   │   ├── ask/                  # RAG 问答
│   │   ├── graph/                # 图谱数据
│   │   ├── search/               # 搜索 + reindex
│   │   ├── sync/                 # 内容同步
│   │   ├── vector/reindex        # 向量重建
│   │   └── upload/               # 附件上传
│   │
│   ├── rss.xml/route.ts
│   ├── sitemap.ts
│   └── globals.css               # 设计系统 + graph/search/ask 语义类
│
├── components/
│   ├── graph/KnowledgeGraph.tsx  # D3 力导向画布
│   ├── home/HomeHero.tsx         # 首页 Hero + 统计
│   ├── post/                     # PostCard, TOC, RelatedPosts…
│   ├── search/                   # 命令搜索、高亮
│   └── ui/EmptyState.tsx         # 空状态复用
│
├── lib/
│   ├── graph-data.ts             # 图谱构建、时间轴、筛选
│   ├── cached-queries.ts         # unstable_cache 公开页查询
│   ├── cache-tags.ts             # revalidateTag 常量
│   ├── search-index.ts           # Meilisearch + SQLite
│   ├── vector-index.ts           # Qdrant REST 客户端
│   ├── embeddings.ts / text-chunk.ts
│   ├── wiki-links.ts             # [[链接]] 解析与 PostLink 同步
│   ├── content-sync.ts           # content/ ↔ DB 闭环
│   ├── site.ts                   # 站点名、首页文案
│   └── reserved-paths.ts         # 保留路径（含 graph）
│
├── services/
│   ├── ai/                       # LLM Provider 抽象
│   └── storage/                  # local / minio / s3
│
├── content/                      # Markdown 真相源
├── prisma/schema.prisma
├── docker-compose.yml
├── Dockerfile                    # 多阶段 standalone 构建
└── docs/
```

---

## 关键设计决策

### 1. Server Components 优先

首页、分类、文章详情、侧边栏为 Server Components，直接查库渲染。搜索、编辑器、图谱、后台为 Client Components。

### 2. Markdown 仅服务端解析

`lib/markdown.ts` 使用 unified/remark/rehype，体积大，仅在服务端运行。编辑器预览走 `POST /api/preview`。

### 3. 双层存储

- **真相源**：`content/` Markdown，Git 管理，可永久迁移
- **派生数据**：SQLite（元数据、阅读量）、Meilisearch 索引、Qdrant 向量 — 均可从 content 重建

### 4. 抽象层隔离变化

- **LLM**：`LLM_PROVIDER` 切换 Claude / OpenAI / Ollama / OpenRouter
- **存储**：`StorageProvider` 接口，local → S3/MinIO 无业务改动
- **数据库**：Prisma，`DATABASE_URL` 切换 SQLite / PostgreSQL

### 5. 搜索与检索演进

| 阶段 | 方案 | 特点 |
|------|------|------|
| 回退 | SQLite contains | 零依赖，中文弱 |
| Phase 2 | Meilisearch | 中文分词、高亮、排序 |
| Phase 3 | Qdrant + Embedding | 语义检索，支撑 `/ask` |

### 6. 缓存与日期序列化

公开页使用 `unstable_cache`（`lib/cached-queries.ts`）配合 `revalidateTag`。

**注意**：`unstable_cache` 会将 `Date` 序列化为 ISO 字符串。必须在缓存**返回后**调用 `reviveDates()` 还原，否则首页分组 `getFullYear()` 等会报错。此问题在 0.4.2 已修复。

### 7. 路由保留路径

`lib/reserved-paths.ts` 定义不能与分类 slug 冲突的路径（含 `graph`、`search`、`ask`、`admin` 等）。

---

## 数据库模型

```
Post ──────────────── Attachment
 │ 1:N
 │
 ├── PostLink（双向链接，fromPostId / toPostId）
 ├── PageView（访问记录）
 │
User（管理员）
SiteConfig（KV 配置）
```

`Post` 主要字段：`category`, `series`, `seriesOrder`, `tags`（JSON 字符串）, `publishedAt`, `status`。

---

## 请求流程示例

### 首页加载

```
GET /
  → getHomePostsPage() + getHomeSummaryCached()  [unstable_cache]
  → reviveDates() 还原日期
  → 按月 reduce 分组
  → SSR HTML + Suspense Sidebar
```

### RAG 问答

```
POST /api/ask { question }
  → 鉴权（默认需登录，ASK_PUBLIC 可放开）
  → embeddings.embed(question)
  → vector-index.search(qdrant, topK)
  → LLM 综合回答 + 来源 slug 列表
```

### 内容同步

```
POST /api/sync（X-Sync-Secret 或管理员 Session）
  → sync-lock 防并发（409）
  → 扫描 content/*.md
  → upsert Post + PostLink + 搜索/向量增量索引
  → revalidateTag 失效页面缓存
```

### 知识图谱

```
GET /api/graph?view=timeline
  → getTimelineGraphData()
  → JSON { nodes, links, timeline: { steps } }
  → GraphClient 客户端 filterGraphByTimelineStep + applyGraphFilters
  → D3 力导向渲染
```

---

## 设计系统（0.3.x）

- CSS Variables 主题：`classic`（默认）、`dark`、`eye`、`parchment`、`ink`
- 语义类：`text-display`, `surface-panel`, `timeline-month`, `badge-category`
- 品牌：默认名 **PLAIN MLOG**，首页导航「所有内容」（`lib/site.ts`）
- 图谱令牌：`--graph-node-*`, `--graph-edge`

---

## 测试

```
tests/
├── graph-data.test.ts      # 图谱构建与筛选
├── content-sync.test.ts    # 同步逻辑
├── search-index.test.ts
├── vector-index.test.ts
├── wiki-links.test.ts
└── ...
```

运行：`npm test`（Vitest，51 项）
