# ⚡ 快速开始

本文档帮助你在 **5 分钟内**在本地运行项目。

---

## 前置要求

| 工具 | 版本要求 | 检查命令 |
|------|----------|----------|
| Node.js | ≥ 20.x | `node --version` |
| npm | ≥ 10.x | `npm --version` |
| Git | 任意 | `git --version` |

---

## 第一步：获取代码

```bash
# 克隆仓库
git clone https://github.com/yourname/knowledge-blog.git
cd knowledge-blog
```

---

## 第二步：安装依赖

```bash
npm install --legacy-peer-deps
```

> 使用 `--legacy-peer-deps` 是因为部分包的 peer dependency 声明较旧，不影响实际运行。

---

## 第三步：配置环境变量

```bash
cp .env.example .env
```

用任意编辑器打开 `.env`，**最少只需要修改以下 3 项**即可本地运行：

```bash
# .env

# 管理员账号（登录后台用）
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="your-password-here"

# NextAuth 密钥（随机字符串即可，至少 32 位）
NEXTAUTH_SECRET="any-random-string-at-least-32-characters"

# Claude API（可选，不填 AI 功能不可用，其余功能正常）
ANTHROPIC_API_KEY="sk-ant-xxxx"
```

其他配置保持默认值即可。

---

## 第四步：初始化数据库

```bash
npx prisma db push
```

这会在 `prisma/dev.db` 创建 SQLite 数据库，并建好所有表结构。

---

## 第五步：启动开发服务器

```bash
npm run dev
```

启动成功后，打开浏览器访问：

| 地址 | 说明 |
|------|------|
| http://localhost:3000 | 博客首页（公开） |
| http://localhost:3000/admin | 管理后台（需登录） |
| http://localhost:3000/admin/login | 登录页 |

---

## 第六步：写第一篇笔记

### 方式 A：使用在线编辑器

1. 打开 http://localhost:3000/admin/login
2. 输入你在 `.env` 中配置的邮箱和密码
3. 点击左侧菜单「**新建笔记**」
4. 填写标题、选择分类，在编辑器中写 Markdown
5. 点击「**AI 生成**」按钮自动生成摘要和标签（需要 API Key）
6. 将状态改为「**发布**」，点击「**保存**」

### 方式 B：同步本地 Markdown 文件

将已有的 Markdown 文件放入 `content/` 对应分类目录：

```
content/
├── ai/          → AI 相关笔记
├── web-dev/     → Web 开发笔记
├── huawei-datacom/  → 华为数通
└── ...
```

文件需要包含 frontmatter 头部：

```yaml
---
title: 我的第一篇笔记
category: ai
tags: ["llm", "transformer"]
status: published
publishedAt: 2024-01-15
summary: 这是摘要（可选，不填可用 AI 生成）
---

# 正文从这里开始
```

然后在后台「**设置 → 从文件系统同步**」点击同步按钮，文件即导入数据库。

---

## 常见问题

**Q: 运行 `prisma db push` 报错 "failed to fetch"？**

```bash
# 设置环境变量跳过校验
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma db push
```

**Q: 启动后访问 /admin 一直跳转到登录页？**

检查 `.env` 中 `NEXTAUTH_SECRET` 是否已设置且不少于 32 个字符。

**Q: AI 功能点击无响应？**

确认 `ANTHROPIC_API_KEY` 已正确填写，且账号有 API 余额。不配置 API Key 时，其余功能完全正常。

**Q: 上传图片后显示不出来？**

确认 `public/uploads/` 目录存在且有写权限：
```bash
mkdir -p public/uploads && chmod 755 public/uploads
```

---

## 下一步

- 查看 [部署指南](DEPLOYMENT.md) 将博客发布到公网
- 查看 [配置说明](CONFIGURATION.md) 了解所有可配置项
- 查看 [写作指南](WRITING.md) 了解 Markdown 扩展语法
