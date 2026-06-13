# Changelog

本项目遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

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

- [ ] 双向链接关系图（D3.js 力导向图）
- [ ] 标签聚合图
- [ ] 知识时间演化视图
- [ ] 节点点击跳转

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
