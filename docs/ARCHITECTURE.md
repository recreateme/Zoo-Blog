# 🏗️ 架构说明

本文档介绍项目的技术架构、数据流和关键设计决策。

---

## 系统架构总览

```
┌─────────────────────────────────────────────────────────┐
│  用户浏览器 / 本地编辑器                                  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│  VPS（Ubuntu 22.04）                                     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Nginx                                          │    │
│  │  - SSL 终止（Let's Encrypt）                    │    │
│  │  - 反向代理到 Next.js :3000                     │    │
│  │  - 静态文件直接服务（/uploads）                  │    │
│  │  - API 请求限速                                 │    │
│  └──────────────────────┬──────────────────────────┘    │
│                         │                               │
│  ┌──────────────────────▼──────────────────────────┐    │
│  │  Next.js 14 App（PM2 守护，:3000）               │    │
│  │                                                 │    │
│  │  Server Components    Client Components         │    │
│  │  ─────────────────    ────────────────          │    │
│  │  首页/分类/文章页     搜索/编辑器/后台           │    │
│  │  （SSG + ISR）        （客户端交互）             │    │
│  │                                                 │    │
│  │  API Routes（Next.js）                          │    │
│  │  /api/posts  /api/ai  /api/upload               │    │
│  │  /api/search /api/sync /api/preview             │    │
│  └────────┬─────────────────────┬───────────────────┘    │
│           │                     │                       │
│  ┌────────▼──────┐   ┌──────────▼───────────────┐       │
│  │  SQLite       │   │  文件系统                 │       │
│  │  (Prisma)     │   │  content/ Markdown        │       │
│  │  元数据存储   │   │  public/uploads/ 附件     │       │
│  └───────────────┘   └──────────────────────────┘       │
│                                                         │
│  ┌────────────────┐   ┌──────────────────────────┐      │
│  │  Meilisearch   │   │  Qdrant                  │      │
│  │  :7700         │   │  :6333                   │      │
│  │  全文搜索      │   │  向量数据库（RAG）         │      │
│  │  （Phase 2）   │   │  （Phase 3）              │      │
│  └────────────────┘   └──────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
                         │
          ┌──────────────┼─────────────────┐
          │              │                 │
  ┌───────▼──────┐ ┌─────▼─────┐  ┌───────▼───────┐
  │  GitHub      │ │  Claude   │  │  本地电脑      │
  │  内容备份    │ │  API      │  │  rsync 同步源  │
  └──────────────┘ └───────────┘  └───────────────┘
```

---

## 目录结构详解

```
knowledge-blog/
│
├── app/                          # Next.js App Router 根目录
│   ├── (public)/                 # 路由组：共享 Header+Footer 布局
│   │   ├── layout.tsx            # 公开页面布局（Header + Footer）
│   │   ├── page.tsx              # / 首页：时间线，按年月分组
│   │   ├── [category]/page.tsx   # /ai, /web-dev 等分类页
│   │   ├── post/[slug]/page.tsx  # /post/xxx 文章详情页
│   │   └── search/               # /search 搜索页
│   │       ├── page.tsx          # Suspense 包装（解决 useSearchParams）
│   │       └── SearchClient.tsx  # 实际搜索交互组件（Client Component）
│   │
│   ├── admin/                    # 管理后台（受 middleware 保护）
│   │   ├── layout.tsx            # 后台布局（侧边导航）
│   │   ├── AdminSidebar.tsx      # 侧边导航组件
│   │   ├── login/page.tsx        # 登录页（公开）
│   │   ├── dashboard/page.tsx    # 仪表盘
│   │   ├── posts/page.tsx        # 笔记列表管理
│   │   ├── editor/               # 编辑器
│   │   │   ├── page.tsx          # 新建文章
│   │   │   └── [slug]/page.tsx   # 编辑已有文章
│   │   ├── files/page.tsx        # 附件管理
│   │   └── settings/page.tsx     # 系统设置与内容同步
│   │
│   ├── api/                      # API Routes
│   │   ├── auth/[...nextauth]/   # NextAuth 认证端点
│   │   ├── posts/                # CRUD：GET(list) POST(create)
│   │   │   └── [slug]/           # CRUD：GET PUT DELETE
│   │   ├── ai/
│   │   │   ├── summarize/        # POST：生成摘要
│   │   │   └── tags/             # POST：生成标签
│   │   ├── upload/               # POST(上传) GET(列表) DELETE
│   │   ├── search/               # GET：全文搜索
│   │   ├── sync/                 # POST(索引) GET(状态)
│   │   └── preview/              # POST：Markdown → HTML
│   │
│   ├── rss.xml/route.ts          # RSS Feed 生成
│   ├── sitemap.ts                # sitemap.xml 自动生成
│   ├── layout.tsx                # 根布局（ThemeProvider、字体、KaTeX CSS）
│   └── globals.css               # 全局样式 + CSS 变量设计系统
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx            # 顶部导航（含分类下拉菜单）
│   │   ├── Sidebar.tsx           # 侧边栏（分类统计 + 热门标签，Server Component）
│   │   └── Footer.tsx            # 页脚（RSS 链接、版权）
│   ├── post/
│   │   ├── PostCard.tsx          # 文章卡片（default/compact/featured 三种变体）
│   │   ├── TableOfContents.tsx   # 目录（IntersectionObserver 高亮当前节）
│   │   ├── MarkdownRenderer.tsx  # HTML 渲染（注入代码复制按钮）
│   │   └── ReadingProgress.tsx   # 顶部阅读进度条
│   ├── editor/
│   │   └── MonacoEditor.tsx      # Monaco 编辑器封装（动态导入，分栏视图）
│   └── ui/
│       ├── Badge.tsx             # 分类/标签/状态 徽章组件
│       └── ThemeToggle.tsx       # 深色/浅色主题切换
│
├── lib/
│   ├── auth.ts                   # NextAuth 配置（Credentials + JWT）
│   ├── categories.ts             # 分类定义（ID/名称/颜色/图标）
│   ├── db.ts                     # Prisma 客户端单例（防止热更新创建多连接）
│   ├── markdown.ts               # unified 解析管道（Server Only）
│   └── utils.ts                  # 通用工具（日期、slug、阅读时长、标签序列化）
│
├── services/
│   ├── ai/
│   │   ├── provider.ts           # LLMProvider 接口 + 工厂函数 + Prompt 模板
│   │   ├── claude.ts             # Anthropic Claude 实现
│   │   ├── openai.ts             # OpenAI 兼容实现
│   │   ├── deepseek.ts           # DeepSeek（复用 OpenAI 格式）
│   │   └── ollama.ts             # Ollama 本地模型（复用 OpenAI 格式）
│   └── storage/
│       ├── provider.ts           # StorageProvider 接口 + 工厂函数
│       ├── local.ts              # 本地文件系统（含 sharp 图片压缩）
│       ├── minio.ts              # MinIO 存根（待实现）
│       └── s3.ts                 # AWS S3 存根（待实现）
│
├── types/
│   ├── index.ts                  # 业务类型定义（Post, Attachment, Category 等）
│   └── next-auth.d.ts            # NextAuth Session 类型扩展
│
├── middleware.ts                  # 路由中间件（保护 /admin/* 路由）
├── prisma/schema.prisma           # 数据库 Schema（6 个模型，3 个枚举）
├── content/                       # Markdown 笔记文件（Git 管理的内容真相源）
├── public/uploads/                # 用户上传的附件（UUID 命名）
├── scripts/                       # 运维脚本
├── docs/                          # 项目文档
├── docker-compose.yml             # 容器编排
├── nginx.conf                     # Nginx 配置模板
└── Dockerfile                     # 多阶段构建
```

---

## 关键设计决策

### 1. 路由分组：`(public)` vs `admin`

使用 Next.js 路由组 `(public)` 让首页、分类、文章页共享带 Header/Footer 的布局，而 `admin` 有独立的侧边栏布局。括号不会出现在 URL 中。

### 2. Server Components 优先

所有能在服务端渲染的页面（首页、分类页、文章详情、侧边栏）都是 Server Components，直接查询数据库，没有客户端 fetch 开销。只有需要交互的部分（搜索、编辑器、后台管理）才是 Client Components。

### 3. Markdown 解析仅在服务端

`lib/markdown.ts` 使用了 `unified`、`remark`、`rehype` 系列包，这些包体积较大且只适合服务端运行。编辑器的实时预览通过调用 `/api/preview` 服务端接口实现，而不是在客户端引入这些包。

### 4. 双层存储

- **内容真相源**：`content/` 目录下的 Markdown 文件，由 Git 管理，永久可迁移
- **元数据缓存**：SQLite 数据库，存储 AI 生成的摘要、标签、阅读量等，从文件重新生成即可恢复

### 5. 抽象层隔离变化

- **LLM 抽象层**：通过 `LLMProvider` 接口，切换 AI 提供商只需修改 `LLM_PROVIDER` 环境变量
- **存储抽象层**：通过 `StorageProvider` 接口，从本地存储迁移到 S3/MinIO 不需要改业务代码
- **Prisma ORM**：修改 `DATABASE_URL` 即可从 SQLite 切换到 PostgreSQL

### 6. 搜索三阶段演进

| 阶段 | 方案 | 特点 |
|------|------|------|
| Phase 1 | Fuse.js | 纯前端，零部署成本，支持模糊搜索 |
| Phase 2 | Meilisearch | Docker 部署，支持中文分词、拼音，体验优秀 |
| Phase 3 | Qdrant + Embedding | 语义向量搜索，找"相关概念"而非"相同词" |

---

## 数据库模型

```
Post ──────────────── Attachment
 │ 1:N                   N:1
 │
 │ N:M（通过 PostLink）
 │
PostLink（双向链接）
 fromPostId → Post
 toPostId   → Post

Post 1:N PageView（访问记录）

User（管理员账号）

SiteConfig（站点配置 KV 存储）
```

---

## 请求流程示例

### 文章详情页加载

```
浏览器 GET /post/introduction-to-llm
  → Nginx 转发到 Next.js :3000
  → Next.js Server Component（PostPage）
  → prisma.post.findUnique({ id: 'introduction-to-llm' })
  → parseMarkdown(post.content)   # unified 解析管道
  → incrementViewCount()          # 访问量 +1
  → 返回完整 HTML（SSR）
  → 浏览器渲染，Client Components 水合（TOC、进度条）
```

### AI 摘要生成

```
编辑器（Client）
  → POST /api/ai/summarize { content, title }
  → getServerSession()            # 验证登录状态
  → createLLMProvider()           # 根据 LLM_PROVIDER 实例化
  → llm.summarize(content, title) # 调用 Claude API
  → 返回 { summary, keywords }
  → 编辑器填充摘要和标签输入框
```

### 本地文件同步

```
本地执行 sync-local.sh
  → rsync 将 ~/MyNotes/*.md 传输到 VPS content/
  → curl POST /api/sync           # 触发重新索引
  → 扫描 content/ 所有 .md 文件
  → 对每个新文件：extractPostMeta() → prisma.post.create()
  → 返回 { added: N, skipped: M }
```
