# 架构与技术栈（v0.5.0）

面向后续**手动改代码 / 改内容 / 改部署**的参考手册：技术栈、目录职责、常改入口。

相关文档：[配置说明](CONFIGURATION.md) · [部署指南](DEPLOYMENT.md) · [写作指南](WRITING.md) · [运维手册](OPERATIONS.md) · [笔记上传手册](../笔记上传手册.md)

---

## 1. 技术栈汇总

| 层级 | 技术 | 版本/说明 | 职责 |
|------|------|-----------|------|
| 框架 | **Next.js** App Router | 14.2.x | 页面路由、SSR/ISR、API Route、Middleware |
| 语言 | **TypeScript** | 严格模式 | 全仓类型 |
| UI | **React** 18 + **Tailwind CSS** | + CSS Variables 主题 | 5 套主题（`classic` / `dark` / `eye` / `parchment` / `ink`） |
| 图标 | lucide-react | — | 后台与部分公开组件 |
| 编辑器 | **Monaco Editor** | — | `/admin/editor` 分栏预览 |
| ORM / DB | **Prisma** + **SQLite** | 可换 PostgreSQL | 元数据、用户、链接、配置 KV |
| 认证 | **NextAuth.js** Credentials | JWT Session | 后台登录；env 管理员或 DB User |
| 全文搜索 | **Meilisearch** | 未配置则 SQLite `contains` | `/search`、⌃K |
| 向量 / RAG | **Qdrant** + Embedding API | profile `rag` | `/ask` |
| Markdown | unified / remark / rehype | KaTeX、高亮、slug | 仅服务端解析 |
| 图谱 | **D3** force | `components/graph` | `/graph` 三视图 |
| AI | Claude / OpenAI / DeepSeek / Ollama / OpenRouter | `LLM_PROVIDER` | 摘要、标签、问答 |
| 存储 | local / MinIO / S3 | `STORAGE_PROVIDER` | 附件与封面上传 |
| 测试 | **Vitest** | `npm test` | 单元测试 |
| 部署 | **Docker Compose** 或 PM2+Nginx | `Dockerfile` standalone | 生产推荐 Compose |
| 发布脚本 | Python paramiko + PowerShell | `.deploy.env` | 推 GitHub / SSH 部署 VPS |

### 1.1 运行时数据流（一句话）

```
content/*.md  ──sync──►  SQLite (Prisma)  ──index──►  Meilisearch / Qdrant
     ▲                         │
     │ 后台上传/保存写回         │ 公开页 / admin /api
     └─────────────────────────┘
```

- **内容真相源**：`content/` 内 Markdown（Git 可管）
- **派生数据**：SQLite、搜索索引、向量 — 均可从文件重建
- **专题**：`Series` + `PostSeries`（多对多）；旧 `/{category}` → `/series/{id}` 重定向

---

## 2. 系统拓扑

### Docker 全栈（本地 / VPS 推荐）

```
浏览器 :3000（或 Nginx :443）
        │
        ▼
┌─ blog-net ─────────────────────────────────────┐
│  knowledge-blog-app   Next.js standalone          │
│    volumes: content · prisma · uploads · images │
│        │              │                         │
│        ▼              ▼                         │
│  meilisearch:7700  qdrant:6333（--profile rag） │
│  minio（可选 --profile storage）                 │
└────────────────────────────────────────────────┘
```

### 生产常用路径

| 环境 | 入口 |
|------|------|
| 本仓库 VPS | `http://<VPS_IP>:3000` |
| 后台登录 | `/admin/login` |
| 专题 | `/series`、`/series/[slug]` |
| 设置（发布按钮） | `/admin/settings`（仅 ADMIN） |

密钥：仅写在服务器 `.env` / `.deploy.env`，**不要提交 Git**。`ADMIN_EMAIL` / `ADMIN_PASSWORD` 建议写成 `KEY="value"`，避免漏引号导致登录失败。

---

## 3. 目录结构与修改指引

```
knowledge-blog/
├── app/                    # Next.js App Router：页面 + API
├── components/             # 可复用 UI（按业务分包）
├── lib/                    # 服务端业务逻辑（优先改这里，而不是堆在 page）
├── services/               # AI / 对象存储实现
├── prisma/                 # schema + 本地/挂载的 SQLite 文件
├── content/                # ★ 笔记 Markdown 真相源
├── public/                 # 静态资源（images / uploads / og）
├── scripts/                # 同步、部署、迁移、重建索引
├── tests/                  # Vitest
├── types/                  # 共享 TS 类型
├── docs/                   # 项目文档
├── docker-compose.yml      # 编排 app / meili / qdrant / minio
├── Dockerfile
├── middleware.ts           # 后台鉴权
├── 笔记上传手册.md          # 日常写笔记与发布
└── package.json            # 当前版本见 version 字段
```

### 3.1 `app/` — 路由与 API

| 路径 | 作用 | 手动改时注意 |
|------|------|----------------|
| `app/(public)/page.tsx` | 首页时间线 + 专题 chips + 标签筛选 | 列表样式、分页、`?tag=` |
| `app/(public)/series/` | 专题列表与专题详情（排序/分页/`q`） | 专题阅读体验 |
| `app/(public)/[category]/` | **兼容重定向** → `/series/{id}` | 勿再做分类列表 |
| `app/(public)/post/[slug]/` | 文章页：面包屑、专题、TOC、上下篇 | SEO、导航规则看 `lib/post-navigation` |
| `app/(public)/search/` | 搜索 UI（专题/标签筛选） | 筛选项与 URL 参数 |
| `app/(public)/graph/` | 知识图谱客户端 | 筛选 UI |
| `app/(public)/ask/` | RAG 问答页 | 需 Qdrant + Embedding |
| `app/admin/(dashboard)/` | 仪表盘、笔记、上传、专题、标签、编辑器、附件、设置 | Sidebar：`AdminSidebar.tsx` |
| `app/admin/login/` | 登录表单 | 鉴权逻辑在 `lib/auth.ts` |
| `app/api/posts/` | CRUD、import、import-batch、export zip | 写盘见 `lib/content-write` |
| `app/api/series/`、`tags/` | 专题/标签管理；`[id]/export` 整专题导出 | |
| `app/api/admin/*` | git-sync、deploy-vps、deploy-status | 读 `.deploy.env`，不落库密钥 |
| `app/api/sync/` | content → DB 同步 | `SYNC_SECRET` / 管理员 Session |
| `app/api/search/` | 搜索 + reindex | |
| `app/api/graph/`、`ask/`、`upload/`、`ai/` | 图谱 / 问答 / 附件 / AI | |
| `app/sitemap.ts`、`robots.ts`、`rss.xml/` | SEO | 专题 URL 已纳入 sitemap |

**惯例**：公开列表页尽量 Server Component + `lib/cached-queries.ts`；交互重的用 Client（`*Client.tsx`）。

### 3.2 `components/` — UI

| 目录 | 作用 | 常改场景 |
|------|------|----------|
| `layout/` | Header、Sidebar、Breadcrumbs | 导航、专题入口 |
| `home/` | Hero、专题条、发现区 | 首页第一屏 |
| `post/` | PostCard、TOC、SeriesNav、Related… | 卡片样式、阅读页侧栏 |
| `editor/` | Monaco、专题多选、大纲、附件工具条 | 后台编辑体验 |
| `search/` | 命令面板、高亮 | ⌃K |
| `graph/` | D3 画布 | 节点样式 |
| `ui/` | Badge、EmptyState、主题切换 | 通用控件 |
| `seo/` | JSON-LD | 结构化数据 |

### 3.3 `lib/` — 业务核心（改逻辑优先）

| 文件 | 作用 |
|------|------|
| `auth.ts` | NextAuth；DB 用户优先，否则 `ADMIN_EMAIL`/`ADMIN_PASSWORD`（已 trim 引号） |
| `rbac.ts` | ADMIN / EDITOR |
| `db.ts` | Prisma Client 单例 |
| `markdown.ts` | frontmatter 解析、MD→HTML、`extractPostMeta` |
| `content-sync.ts` | 扫描 `content/` ↔ Post，fingerprint |
| `content-write.ts` | 后台写回 Markdown + frontmatter |
| `content-source.ts` | `filePath` 安全解析、删文件 |
| `series-ops.ts` | 多专题解析、`syncPostSeriesMemberships`、迁移辅助 |
| `series-queries.ts` | 公开专题列表/分页查询 |
| `series-catalog.ts` | 侧栏/首页专题目录 |
| `post-navigation.ts` | 专题内上下篇、系列目录 |
| `search-index.ts` | Meilisearch（含 `seriesIds`）+ SQLite |
| `graph-data.ts` | 图谱构建与筛选 |
| `vector-index.ts` / `embeddings.ts` / `text-chunk.ts` | RAG |
| `wiki-links.ts` | `[[双向链接]]` → PostLink |
| `cached-queries.ts` / `cache-tags.ts` / `revalidate-content.ts` | 缓存与失效 |
| `seo.ts` / `site.ts` | SEO、站点名文案 |
| `deploy-ops.ts` | 后台发布：git push / 跑 deploy 脚本或 Hook |
| `post-export-zip.ts` | 笔记 zip 导出（改写图片相对路径） |
| `categories.ts` | **已弃用**；仅兼容重定向与迁移 |
| `reserved-paths.ts` | 不可与动态段冲突的路径（含 `series`） |
| `rate-limit.ts` / `sync-lock.ts` | 限流与同步互斥 |

### 3.4 `prisma/`

| 文件 | 作用 |
|------|------|
| `schema.prisma` | 数据模型：`Post`、`Series`、`PostSeries`、`User`、`PostLink`、`Attachment`、`SiteConfig`… |
| `*.db` | SQLite 文件；Docker 挂载 `./prisma` |

改 schema 后：

```bash
npx prisma db push          # 或 migrate
npx prisma generate
# 存量分类→专题：npm run migrate:series
```

### 3.5 `content/` 与 `public/`

| 路径 | 作用 |
|------|------|
| `content/**/*.md` | 笔记正文 + YAML frontmatter（见 WRITING.md） |
| `public/images/` | 配图（建议 Git 追踪） |
| `public/uploads/` | 后台上传附件（常挂载、可不入 Git） |

### 3.6 `scripts/`

| 脚本 | 作用 |
|------|------|
| `publish.ps1` / `publish.bat` | 本机：git 提交 content/images 并部署 VPS |
| `deploy-vps.py` / `.ps1` | SSH：`git reset` + `docker compose up --build` + sync |
| `sync-local.sh/.ps1` | rsync content → VPS 后触发 `/api/sync` |
| `migrate-to-series.ts` | 旧 category/series → Series/PostSeries |
| `reindex-search.ts` / `reindex-vectors.ts` | 全量重建索引 |

### 3.7 `services/`

| 目录 | 作用 |
|------|------|
| `services/ai/` | 各 LLM Provider |
| `services/storage/` | local / minio / s3 + 图片处理 |

---

## 4. 数据模型（当前）

```
User ──────────────── 管理员（可选；无则用 env 账号）

Post
 ├─ tags (JSON 字符串，应用层 ≥1)
 ├─ coverImage?
 ├─ category / series / seriesOrder   ← @deprecated 字段，同步兼容
 ├─ seriesLinks → PostSeries → Series  ← 主路径（多专题）
 ├─ PostLink（双向链接）
 └─ Attachment

SiteConfig            同步锁等 KV
```

Frontmatter 推荐（新文）：

```yaml
title: ...
tags: [a, b]
series:
  - name: 专题名
    order: 1
cover: /images/...
status: published
```

---

## 5. 请求流（速查）

### 首页

`GET /` → `getHomePostsPageFiltered` + `listSeriesWithCounts` → SSR 时间线

### 专题页

`GET /series/[slug]?page=&q=` → `PostSeries.order` 排序分页

### 同步

`POST /api/sync` → lock → 扫 MD → upsert Post + PostSeries → 索引 → `revalidateTag`

### 后台上传

`POST /api/posts/import` → 写 `content/` → DB → 可选索引

### 发布（设置页）

- `POST /api/admin/git-sync` → 本地有 `.git` 则 `git add/commit/push`；否则调用宿主机 `DEPLOY_HOOK_URL` / `GIT_SYNC_HOOK_URL`（`scripts/admin-hook-server.py`）
- `POST /api/admin/deploy-vps` → `DEPLOY_HOOK_URL` 或 `scripts/deploy-vps.py`
- 上传成功后可在上传页一键推送；监控路径默认 `content` + `public/images`

### 登录

`authorize`：若 DB 存在同邮箱用户则只验 bcrypt；否则用 env 明文账号（注意引号）。

---

## 6. 手动修改速查表

| 你想改什么 | 优先改哪里 |
|------------|------------|
| 站点名 / 首页口号 | `lib/site.ts` 或 `NEXT_PUBLIC_SITE_*` |
| 顶栏/侧栏导航 | `components/layout/Header.tsx`、`Sidebar.tsx` |
| 首页列表样式 | `app/(public)/page.tsx`、`PostCard.tsx`、`globals.css` |
| 文章排版 / TOC | `app/(public)/post/[slug]/page.tsx`、`components/post/*`、`globals.css` |
| Frontmatter 字段 | `lib/markdown.ts` + `lib/content-write.ts` + `docs/WRITING.md` |
| 专题批量导入 | `lib/post-batch-import.ts`、`app/api/posts/import-batch/`、`upload/BatchImportPanel.tsx` |
| 专题排序规则 | `lib/series-queries.ts`、`lib/post-navigation.ts` |
| 搜索相关性/筛选 | `lib/search-index.ts`、`SearchClient.tsx` |
| 主题颜色 | `app/globals.css`、`lib/themes.ts` |
| 管理员账号 | 服务器 `.env` 的 `ADMIN_*`，然后 `docker compose up -d --force-recreate app` |
| 对接新 LLM | `services/ai/` + `CONFIGURATION.md` |
| 部署行为 | `scripts/deploy-vps.py`、`lib/deploy-ops.ts`、`.deploy.env` |
| 加新公开页 | `app/(public)/...` + 把 slug 写入 `reserved-paths.ts` |

---

## 7. 设计决策摘要

1. **Server Components 优先**公开只读页；重交互用 Client。  
2. **Markdown 只在服务端**解析；预览走 `/api/preview`。  
3. **文件优先**：有 `filePath` 的笔记以 MD 为准；sync 会覆盖 DB。  
4. **分类已废弃，专题多对多**：新功能不要依赖 `lib/categories.ts`。  
5. **密钥不进数据库**：发布凭据只在 env；UI 只显示就绪状态。  
6. **`unstable_cache` 后须 `reviveDates()`**，否则日期方法会挂。

---

## 8. 测试与命令

```bash
npm test                 # Vitest
npm run build            # 生产构建
npm run migrate:series   # 分类→专题数据迁移
npm run search:reindex   # Meilisearch 全量
npm run rag:reindex      # 向量全量
```

CI：`.github/workflows/ci.yml`（test → lint → build）。

---

## 9. 版本对应

| 版本 | 要点 |
|------|------|
| 0.5.0 | 专题体系、上传/zip、后台发布按钮、文档与架构更新 |
| 0.4.x | 图谱筛选、缓存、搜索/RAG 加固 |
| 0.3.x | 设计系统、主题 |

完整变更见根目录 [CHANGELOG.md](../CHANGELOG.md)。
