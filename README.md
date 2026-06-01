# 📚 个人知识库博客

> 基于 Next.js 14 + TypeScript 构建的个人学习笔记发布平台。支持 Markdown 写作、Monaco 在线编辑、AI 辅助摘要与标签、多分类管理、本地笔记 rsync 同步，一键部署到 VPS。

---

## 功能亮点

| 模块 | 功能 |
|------|------|
| **写作** | Markdown + GFM + 数学公式 KaTeX + 代码高亮 Shiki |
| **编辑器** | Monaco Editor 在线编辑，实时分栏预览，Ctrl+S 保存 |
| **AI 辅助** | 一键生成摘要、智能打标签、阅读时长估算 |
| **内容管理** | 草稿/发布状态、多级分类、标签系统、附件管理 |
| **展示** | 时间线首页、分类页、文章详情页含 TOC、全文搜索 |
| **同步** | 本地文件夹 rsync、Git 备份、一键内容索引 |
| **SEO** | sitemap.xml、RSS Feed、Open Graph |
| **部署** | Docker Compose + Nginx + PM2，一键脚本 |

---

## 文档导航

| 文档 | 说明 |
|------|------|
| [快速开始](docs/QUICKSTART.md) | 5 分钟本地运行 |
| [部署指南](docs/DEPLOYMENT.md) | VPS 生产环境完整部署 |
| [配置说明](docs/CONFIGURATION.md) | 所有环境变量详解 |
| [写作指南](docs/WRITING.md) | Markdown 规范与本地同步工作流 |
| [架构说明](docs/ARCHITECTURE.md) | 技术架构与项目结构 |
| [运维手册](docs/OPERATIONS.md) | 备份、监控、迁移与故障排查 |

---

## 技术栈

```
框架    Next.js 14 App Router + TypeScript
样式    Tailwind CSS + CSS Variables 设计系统
数据库  Prisma ORM + SQLite（可无缝迁移 PostgreSQL）
认证    NextAuth.js（邮箱密码 + JWT Session）
AI      Claude API（可切换 OpenAI / DeepSeek / Ollama）
编辑器  Monaco Editor（VS Code 同款内核）
搜索    Fuse.js Phase1 → Meilisearch Phase2
部署    Docker Compose + Nginx + PM2 + Let's Encrypt
```

---

## 许可证

MIT
