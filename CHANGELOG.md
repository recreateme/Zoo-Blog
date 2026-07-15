# Changelog

本项目遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [0.5.0] - 2026-07-14

### 专题体系（分类 → 专题）

- Prisma：`Series` / `PostSeries` 多对多 + `coverImage`；`npm run migrate:series`
- Frontmatter 多专题与封面；content-sync 同步成员；空标签补「未贴标签」
- 公开站：`/series`、`/series/[slug]`（分页 + 专题内搜索）；旧 `/{category}` 301 到专题
- 面包屑 / SEO / sitemap / 搜索·图谱筛选改为专题；顶栏与侧栏去掉分类入口
- 管理端：上传落盘 `content/`、标签/专题管理、zip 导出、编辑器多专题与封面
- 设置页：推送到 GitHub、部署到 VPS（读 `.deploy.env` / `DEPLOY_HOOK_URL`，密钥不落库）

### 文档与稳健性

- 重写 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)：技术栈汇总、目录职责、手动修改速查
- 更新 README / 写作 / 上传手册 / 配置与运维（含后台登录引号排障）
- 登录：`ADMIN_*` 环境变量自动 trim 包裹引号，避免 `.env` 格式错误导致无法登录

### 依赖

- 新增 `jszip`（笔记离线导出）

---

## [0.4.3] - 2026-06-02

### 专题体系（进行中）

- Prisma：`Series` / `PostSeries` 多对多 + `coverImage`；脚本 `npm run migrate:series`
- Frontmatter 支持多专题与封面；content-sync 同步成员关系；标签为空时补「未贴标签」
- 公开站：新增 `/series`、`/series/[slug]`（分页 + 专题内搜索）；旧 `/{category}` 重定向至专题
- 顶栏/侧栏去掉分类入口，改为专题导航；首页展示专题 chips

### 阅读体验

- 阅读进度条加粗，滚动时右上角显示百分比
- 文章侧栏目录支持滚动、章节进度与高亮；TOC 忽略代码块内 `#` 注释伪标题
- 阅读页改为宽版布局：容器约 `90rem`；桌面端目录 `position: fixed` 贴视口最右侧上方，滚动不消失；当前章节高亮并滚到目录面板中央；取消 `.markdown-body` 的 `68ch` 限宽
- 代码块复制：HTTP/公网 IP 等非安全上下文回退 `execCommand`，成功后显示「已复制到剪切板」

### 内容

- 新增计算机视觉长文《传统计算机视觉全解》及封面图（`public/images/traditional-cv-cover.png`）
- 根目录《笔记上传手册》+ `publish.bat` / `scripts/publish.ps1` / `scripts/deploy-vps.ps1` 一键推送 GitHub 并更新 VPS

### 首页阅读索引（借鉴 pingfan 结构）

- `HomeDiscovery`：侧栏/移动端搜索入口（接 ⌃K）+ 标签云筛选
- 压缩 Hero、最近更新条带、`compact` 单栏时间线列表
- 首页 `/?tag=` 筛选；顶栏「更多」收纳问答/图谱/分类
- 搜索页标签云 + 列表/卡片视图切换；loading 骨架对齐新布局

### 维护与精简

- 分类页改为 `compact` 列表，与首页时间线样式统一；教程/章节分组结构保留
- 搜索页去掉 SQLite/Meilisearch 引擎提示（Docker 下默认走 Meilisearch）
- 文章封面图改用 Git 可追踪的 `public/images/`；compose 增加 images 卷挂载
- 移除 `content-source` 死代码、精简 `types/index.ts` 未引用接口
- 卸载冗余依赖：`remark`、`tsparticles`、`@tailwindcss/typography`（正文样式由 `globals.css` 的 `.markdown-body` 承担）
- 修正 `STORAGE_PROVIDER` 文档（移除未实现的 `oss`）
- 附件页复用共享 `Attachment` 类型

---

## [0.4.2] - 2026-06-02

### 知识图谱 · 节点筛选

- 分类芯片、专题下拉、「隐藏孤立节点」切换
- `applyGraphFilters`：笔记链接 / 时间演化 / 标签关联均支持
- 标签节点附带 `categories` / `seriesList` 元数据用于筛选
- 统计栏显示筛选后的节点/边数量

---

## [0.4.1] - 2026-06-02

### 知识图谱 · 时间演化视图

- `/graph` 新增「时间演化」：按月累积展示已发布笔记与 `[[双向链接]]`
- 时间轴滑块 + 播放动画，截至月末快照过滤节点与边
- `GET /api/graph?view=timeline`；`buildTimelineSteps` / `filterGraphByTimelineStep`

---

## [0.4.0] - 2026-06-02

### 知识图谱（Phase F）

- `/graph` 页面：D3 力导向图，支持「笔记链接」「标签关联」双视图
- `GET /api/graph`：基于 `PostLink` 与标签共现生成节点/边数据
- 图谱视觉令牌：`--graph-node-*`、`--graph-edge`；圆角矩形节点（分类色边框）
- 图谱页粒子全强度（96）；顶栏新增「图谱」导航
- `graph` 加入保留路径，避免与分类路由冲突

### 待续（0.4.x）

- [x] 知识时间演化视图
- [x] 节点筛选（分类 / 专题 / 孤立节点）

---

## [0.3.5] - 2026-06-02

### 前端设计（Phase E）

- 后台统一语义类：`.admin-page`、`.admin-panel`、`.admin-toolbar`、`.admin-table-*`
- 设置页同步/搜索/RAG/数据库区块统一 `admin-panel`；反馈条主题感知
- Monaco 编辑器随 `data-theme` 切换 `vs` / `vs-dark`
- `EmptyState` 支持 `compact`，用于笔记列表与附件空状态
- `AdminSidebar` 导航语义化，Logo 与前台 `ScrollText` 一致

---

## [0.3.4] - 2026-06-02

### 前端设计（Phase D）

- 阅读页信息层级：分类 → 标题 → 系列导航 → 摘要 → 元数据
- 侧边 TOC 当前章节 `accent` 左边框高亮（替代仅字色变化）
- 相关笔记改为分类色左边框紧凑卡片（`RelatedPosts`）
- 正文 `max-width: 68ch`；代码块保持横向滚动溢出
- `ArticleOutline`、`PostNav`、`MobileToc` 语义化样式收敛

---

## [0.3.3] - 2026-06-02

### 前端设计（Phase C）

- `/search`：目录检索布局、宽搜索框、分类 `badge-category` 筛选、`EmptyState` 空结果
- `/ask`：批注式对话；助手回答衬线排版；来源改为分类色左边框脚注卡片
- `⌃K` 命令搜索：结果项分类色左边框、键盘焦点高亮、`kbd-hint` 统一快捷键样式
- 新增语义 CSS 类：`.search-*`、`.ask-*`、`.cmd-*`

---

## [0.3.2] - 2026-06-02

### 品牌化

- 站点默认名称改为 **PLAIN MLOG**；首页导航「时间线」改为「所有内容」
- 集中配置：`lib/site.ts`

### 前端设计（Phase A + B）

- 语义 CSS 类（`text-display`、`surface-panel`、`timeline-month` 等）
- 分类 Badge 主题感知色；卡片 hover 去掉上浮动画
- 首页 Hero：统计面板 +「搜索笔记」「向笔记提问」双 CTA
- 时间线左边线索引布局；空状态组件 `EmptyState`
- 首页粒子密度提升，其他页面降低

---

### 修复

- `/api/ask` 默认需登录（`ASK_PUBLIC=true` 可开放）；OpenAI 兼容 Provider 校验 HTTP 错误
- Provider 构造函数不再突变全局 `process.env`；OpenRouter 补充推荐请求头
- Qdrant 向量维度变更时明确报错；向量增量失败写入 `indexErrors`
- 向量检索增加 `VECTOR_MIN_SCORE` 阈值；RAG Prompt 去除重复问题
- 全量向量重建跳过冗余按篇删除；超长文章截断时输出 warn 日志

### 测试

- 新增 ask-auth、reserved-paths、embeddings、openai-provider 测试

---

### 新增

- **RAG 知识问答**：`/ask` 页面 + `POST /api/ask`，语义检索笔记并由 LLM 综合回答
- **向量索引**：`lib/vector-index.ts`（Qdrant REST）、`lib/embeddings.ts`、`lib/text-chunk.ts`
- 同步 / 后台 CRUD 自动增量向量索引；`POST /api/vector/reindex` 全量重建
- CLI：`npm run rag:reindex`
- Docker Qdrant 改为 `profiles: [rag]`（`docker compose --profile rag up -d`）

### 配置

- `QDRANT_URL`、`EMBEDDING_PROVIDER`、`EMBEDDING_MODEL`、`EMBEDDING_DIMENSION`

---

## [0.2.4] - 2026-06-02

### 新增

- **分类页分页**：`/{category}?page=2`，每页 24 篇，保留专题大纲
- **DB 同步锁**：`SiteConfig` 表实现多实例互斥（替代文件锁）
- **API 限速**：搜索 / 同步 / 上传 / 重建索引（内存滑动窗口）
- **EDITOR 角色 RBAC**：编辑者隐藏设置页，同步/重建索引需 ADMIN

### 变更

- Session/JWT 携带 `role` 字段

---

## [0.2.3] - 2026-06-02

### 新增

- **MinIO / S3 对象存储**：完整实现 `upload` / `delete` / `exists`；共享 `image-process.ts` WebP 压缩
- **Docker MinIO**：`docker compose --profile storage up -d minio`
- **双向链接**：`[[标题]]` 渲染为文章链接；`PostLink` 表随同步/CRUD 自动维护
- 搜索页 SQLite 回退时显示 Meilisearch 配置提示

### 变更

- 移除未使用的 `fuse.js` 依赖；README 搜索说明更新
- 上传 API 修复 WebP 转换后 `storedKey` 与文件不一致的问题
- `docs/ARCHITECTURE.md` 目录树与实现对齐

---

## [0.2.2] - 2026-06-02

### 新增

- 公开页数据缓存：`unstable_cache` + ISR（首页/分类 5 分钟，文章 1 小时）
- 内容变更自动 `revalidateTag`（同步、后台 CRUD、重建索引）
- 阅读量内存缓冲批量写入（`lib/view-count.ts`）
- Vitest 单元测试（content-sync、markdown、search-index、heading-slug、view-count）
- GitHub Actions CI（test + lint + build）

### 变更

- `npm test` 运行 Vitest；`test:sync` 指向 content-sync 测试文件

---

## [0.2.1] - 2026-06-02

### 新增

**Code Review 修复与体验优化**
- TOC slug 与 `rehype-slug` 对齐（`lib/heading-slug.ts` + `github-slugger`）
- 内容源策略：`lib/content-source.ts`；删除 API 支持 `?deleteFile=1` 同步删 MD
- 首页分页（`/?page=`，每页 24 篇）；搜索页 debounce + URL 同步
- 后台笔记搜索 `GET /api/posts?q=`；教程名 autocomplete（`seriesOptions=1`）
- 文首要点 `outline` 编辑器；新建页实时预览 + Ctrl+S
- 重建搜索索引：`POST /api/search/reindex`
- 同步单元测试：`npm run test:sync`

**P2：SEO / 编辑器 / 同步加固**
- JSON-LD（Article、Breadcrumb、WebSite、CollectionPage）+ og:image / Twitter Card
- 默认分享图 `public/og-default.svg`
- 编辑器内附件上传插入（`EditorAttachToolbar` + 光标处 `insertText`）
- 同步互斥锁（`lib/sync-lock.ts`，并发返回 409）
- Windows 同步脚本 `scripts/sync-local.ps1`（WSL rsync / scp 回退）
- 可选附件 rsync（`SYNC_UPLOADS` 配置项）

### 变更

- 同步指纹改为内容 SHA256（替代纯 mtime）；增量 Meilisearch 索引
- `sync-local.sh`：3 次重试、附件同步、`SYNC_SECRET` 鉴权
- 设置页展示同步 `errors` / `indexErrors` 明细
- 分类页面包屑；Header 分类导航高亮

### 修复

- 解析失败文件不再误删数据库记录
- 同路径 slug 变更时正确清理旧记录
- Meilisearch filter 值转义；全量重建索引先清空再写入
- `docs/OPERATIONS.md` 同步鉴权示例修正为 `X-Sync-Secret`

---

## [0.2.0] - 2026-06-02

### 新增

**内容同步闭环**
- 文件删除或 `rsync --delete` 后，同步时自动清理对应数据库记录
- 同文件修改 slug 时，自动删除旧 slug 记录并以新 slug 入库
- 同步状态展示：文件绑定数、待清理孤儿记录数
- 后台设置页补充「文件优先」同步策略说明

**Meilisearch 全文搜索**
- 接入 Meilisearch（中文分词、模糊匹配、结果高亮）
- `/api/search` 优先走 Meilisearch，未配置时回退 SQLite
- 同步、后台创建/更新/删除文章时自动维护搜索索引
- 设置页展示搜索索引连接状态与文档数

**教程层级（系列阅读）**
- 面包屑：`首页 > 分类 > 教程 > 章节 > 标题`
- 分类页大纲按教程 → 章节嵌套展示
- 侧栏专题列表嵌套章节链接
- 文章页教程目录（SeriesNav）按章节分组
- `docs/WRITING.md` 补充教程/章节 frontmatter 约定

**阅读体验（JavaGuide 借鉴）**
- 同专题上一篇/下一篇（按 `seriesOrder`）
- 文首要点（`outline` frontmatter）
- Ctrl+K 全局快速搜索
- 分类页大纲视图、首页专题卡片
- 暗黑模式、移动端 TOC、相关笔记优先同专题
- 文章页「编辑此页」GitHub 链接

### 变更

- 同步 API 响应增加 `deleted`、`reindexed` 字段
- `.env.example` 默认启用 Meilisearch 本地开发配置

### 修复

- 同步时 `series` / `seriesOrder` / `wordCount` 字段完整写入
- 教程分组排序与章节锚点 ID 一致性

---

## [0.1.0] - 2024-01

### 新增

**核心博客功能**
- 首页时间线视图（按年月分组，渐入动画）
- 多级分类页面（7 个预设分类）
- 文章详情页（TOC 目录 + 阅读进度条 + 相关推荐）
- 全文搜索页（关键词 + 分类 + 标签三维筛选）
- 暗色/浅色主题切换

**内容处理**
- Markdown 完整渲染管道（GFM + 数学公式 KaTeX + 代码高亮 Shiki）
- 双向链接 `[[note]]` 解析
- 代码块一键复制按钮
- PDF 内嵌预览支持
- Word (.docx) 上传自动转 Markdown

**管理后台**
- 管理员登录（邮箱密码 + JWT Session）
- 仪表盘（统计卡片 + 分类占比 + 最近笔记）
- 笔记列表管理（分页、筛选、快速操作）
- Monaco Editor 在线编辑器（实时分栏预览、Ctrl+S 保存）
- AI 一键生成摘要和标签
- 附件管理（拖拽上传、图片自动压缩 WebP）
- 系统设置与内容同步管理

**AI 服务**
- LLM 抽象层（Claude / OpenAI / DeepSeek / Ollama 可热切换）
- 自动生成摘要（~200 字）
- 智能推荐标签（3~6 个）
- 阅读时长估算

**基础设施**
- 存储抽象层（本地 / MinIO / S3 接口一致）
- Git 内容备份 + rsync 本地同步
- sitemap.xml 自动生成
- RSS Feed（/rss.xml）
- Open Graph 元数据
- Docker Compose 容器编排
- Nginx 反向代理配置模板
- 一键部署脚本（Ubuntu 22.04）
- 每日自动备份脚本（cron）

---

## 计划中

### [0.3.0] - RAG 知识问答

- [ ] Qdrant 向量数据库集成
- [ ] 文章内容自动向量化（发布时触发）
- [ ] `/ask` 问答页面（对话式 UI）
- [ ] 基于笔记库的 RAG 问答（附来源引用）
- [ ] 相关文章推荐（基于 Embedding 相似度）

### [0.4.0] - 知识图谱

- [x] 双向链接关系图（D3.js 力导向图）
- [x] 标签聚合图（标签共现）
- [x] 知识时间演化视图
- [x] 节点点击跳转

### [0.5.0] - 统计与增强

- [ ] 访问统计仪表盘（PV、热门文章）
- [ ] 连续写作天数（打卡 Streak）
- [ ] 评论系统（可选，Giscus 或自建）
- [ ] 2FA 双因素认证
- [ ] API Rate Limit（Upstash Redis）

### 长期规划

- [ ] 数据库迁移至 PostgreSQL（高并发场景）
- [ ] CDN 静态资源加速
- [ ] PWA 离线支持
- [ ] 多用户/协作编辑
- [ ] Agent 助手（基于笔记库的智能问答机器人）
