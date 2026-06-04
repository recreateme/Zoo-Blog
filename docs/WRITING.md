# ✍️ 写作指南

本文介绍如何在知识库中写作，包括 Markdown 语法扩展、Frontmatter 规范和本地同步工作流。

---

## 目录

1. [Frontmatter 规范](#1-frontmatter-规范)
2. [Markdown 语法扩展](#2-markdown-语法扩展)
3. [分类与标签](#3-分类与标签)
4. [在线编辑器使用](#4-在线编辑器使用)
5. [本地写作工作流](#5-本地写作工作流)
6. [附件插入](#6-附件插入)

---

## 1. Frontmatter 规范

每篇 Markdown 文章以 YAML frontmatter 开头，格式如下：

```yaml
---
title: 文章标题（必填）
category: ai              # 分类 ID（必填，见下方分类表）
subcategory: 基础理论      # 子分类（可选）
series: TCP 传输层         # 专题/系列名（可选，同系列可设 order 排序）
order: 1                  # 专题内顺序，越小越靠前（也可用 seriesOrder）
tags:                     # 标签列表（可选，也可 AI 生成）
  - llm
  - transformer
  - deep-learning
status: published         # draft（草稿）或 published（发布），默认 draft
publishedAt: 2024-01-15   # 发布日期（可选）
summary: |                # 摘要（可选，也可 AI 生成）
  这里写一段 100~200 字的摘要，
  会显示在文章列表和 SEO 描述中。
outline:                  # 文首要点（可选）
  - 第一个问题或章节目标
  - 第二个要点
---

# 正文从这里开始
```

### Frontmatter 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | ✅ | 文章标题，显示在列表和详情页 |
| `category` | string | ✅ | 分类 ID，见下方分类表 |
| `subcategory` | string | ❌ | 子分类，自由定义 |
| `tags` | string[] | ❌ | 标签数组，建议 3~6 个 |
| `status` | enum | ❌ | `draft` 或 `published`，默认草稿 |
| `publishedAt` | date | ❌ | 发布日期，格式 `YYYY-MM-DD` |
| `summary` | string | ❌ | 摘要，不填时可在后台用 AI 生成 |
| `outline` | string[] | ❌ | 文首「本文要点」列表，见下方示例 |

---

## 2. Markdown 语法扩展

在标准 Markdown 基础上，支持以下扩展：

### GFM（GitHub Flavored Markdown）

**表格：**
```markdown
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| a   | b   | c   |
```

**任务列表：**
```markdown
- [x] 已完成
- [ ] 待办事项
```

**删除线：**
```markdown
~~删除的内容~~
```

---

### 数学公式（KaTeX）

**行内公式：**
```markdown
欧拉公式 $e^{i\pi} + 1 = 0$ 是数学中最美的公式。
```

**块级公式：**
```markdown
$$
\mathcal{L} = -\sum_{t} \log P(w_t \mid w_1, \ldots, w_{t-1}; \theta)
$$
```

**矩阵：**
```markdown
$$
A = \begin{pmatrix} a_{11} & a_{12} \\ a_{21} & a_{22} \end{pmatrix}
$$
```

---

### 代码高亮（Shiki）

指定语言获得精确高亮：

````markdown
```python
def attention(Q, K, V):
    d_k = Q.shape[-1]
    scores = Q @ K.T / (d_k ** 0.5)
    return softmax(scores) @ V
```

```bash
npm install && npm run dev
```

```sql
SELECT * FROM posts WHERE status = 'PUBLISHED'
ORDER BY published_at DESC;
```
````

支持的语言包括：`python`, `javascript`, `typescript`, `bash`, `sql`, `yaml`, `json`, `go`, `rust`, `java`, `c`, `cpp`, `nginx`, `dockerfile` 等数百种。

---

### 双向链接（Wiki Links）

用 `[[文章标题]]` 或 `[[文章slug]]` 链接到其他笔记：

```markdown
关于 Attention 机制，详见 [[introduction-to-llm]]。

也可以用 [[大型语言模型入门]] 的形式（按标题）。
```

如果链接目标存在，渲染为可点击链接；如果不存在，渲染为虚线下划线的提示样式。

---

### 引用块

```markdown
> **重要概念**：LLM 的核心是自回归语言建模，
> 即在给定前文的条件下预测下一个 token。
```

---

### 插入图片

```markdown
![图片描述](/uploads/uuid-filename.webp)

<!-- 指定尺寸（HTML） -->
<img src="/uploads/uuid.webp" alt="描述" width="600" />
```

---

### 插入 PDF（内嵌预览）

```html
<iframe
  src="/uploads/your-document.pdf"
  width="100%"
  height="600px"
  style="border: 1px solid var(--border-default); border-radius: 8px;"
></iframe>
```

---

## 3. 分类与标签

### 预设分类

| 分类 ID | 名称 | 说明 |
|---------|------|------|
| `ai` | AI · 人工智能 | 大模型、机器学习、深度学习 |
| `computer-vision` | 计算机视觉 | CV、图像处理、目标检测 |
| `huawei-datacom` | 华为数通 | HCIA/HCIP 网络认证 |
| `web-dev` | Web 开发 | 前端、后端、全栈 |
| `project-management` | 项目管理 | PMP、敏捷开发 |
| `life` | 生活笔记 | 读书、随想、日常 |
| `others` | 其他 | 不便归类的内容 |

### 标签规范建议

- 使用**小写字母**和**连字符**：`deep-learning`，不用 `DeepLearning`
- 尽量**具体**：`ospf-protocol` 优于 `network`
- 每篇文章建议 **3~6 个**标签
- 常用标签示例：`transformer`, `llm`, `cnn`, `ospf`, `bgp`, `react`, `nextjs`, `python`, `docker`

---

## 4. 在线编辑器使用

访问 `https://yourdomain.com/admin/editor` 进入在线编辑器。

### 界面说明

```
┌──────────────────────────────────────────────────────┐
│ 顶部栏：文章名 | 阅读时长 | 预览 | 状态选择 | 保存   │
├────────────────────┬─────────────────────────────────┤
│                    │                                 │
│   左侧：元数据表单  │   右侧：Monaco 编辑器           │
│   - 标题           │   ┌──────────┬──────────────┐  │
│   - Slug           │   │  编辑    │     预览     │  │
│   - 分类           │   │          │              │  │
│   - 子分类         │   │  Markdown│  HTML 渲染   │  │
│   - 摘要           │   │          │              │  │
│   - 标签           │   └──────────┴──────────────┘  │
│                    │                                 │
└────────────────────┴─────────────────────────────────┘
```

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+S` / `Cmd+S` | 保存文章 |
| `Ctrl+/` | 切换注释 |
| `Tab` | 增加缩进 |
| `Shift+Tab` | 减少缩进 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Shift+Z` | 重做 |

### AI 功能使用

1. 写好正文内容后，点击摘要栏右侧的「**AI 生成**」按钮
2. 等待 2~5 秒，自动填入摘要
3. 点击标签栏右侧的「**AI 生成**」按钮，自动推荐 3~6 个标签
4. 可以手动删改 AI 建议的内容
5. 保存即生效

---

## 5. 本地写作工作流

推荐使用 **Obsidian** 或任意 Markdown 编辑器在本地写作，通过 rsync 同步到服务器。

### 初始化本地同步配置

```bash
# 复制同步配置模板
cp .sync.env.example .sync.env

# 编辑配置
nano .sync.env
```

配置内容：

```bash
# 你的本地笔记目录（Obsidian Vault 路径）
LOCAL_NOTES_DIR="$HOME/Documents/MyNotes"

# VPS 连接信息
VPS_HOST="123.45.67.89"
VPS_PORT="22"
VPS_USER="root"
VPS_CONTENT_DIR="/var/www/blog/content"

# 同步后是否触发服务器重新索引
TRIGGER_REINDEX=true
BLOG_URL="https://yourdomain.com"
```

### 执行同步

```bash
# 手动同步一次
./scripts/sync-local.sh

# 每 30 秒自动同步（写作期间）
watch -n 30 ./scripts/sync-local.sh

# 只同步 Markdown 文件（忽略图片等）
```

### 同步后在后台索引

同步脚本会自动触发服务器端的 `/api/sync` 接口，将新文件导入数据库。

如果自动触发失败，也可以手动在后台「**设置**」页面点击「**从文件系统同步**」。

### 本地目录结构建议

将本地笔记目录按照与 `content/` 相同的分类组织：

```
~/Documents/MyNotes/
├── ai/
│   ├── introduction-to-llm.md
│   └── transformer-architecture.md
├── web-dev/
│   └── nextjs-app-router.md
├── huawei-datacom/
│   ├── ospf-basics.md
│   └── bgp-advanced.md
└── ...
```

---

## 6. 附件插入

### 上传图片（推荐方式）

1. 进入后台「**附件管理**」
2. 拖拽图片或点击上传（支持 JPG/PNG/WebP/GIF/SVG）
3. 图片自动压缩为 WebP 格式
4. 点击「**复制链接**」获取 URL
5. 在文章中插入：`![描述](复制的URL)`

### 上传 PDF

1. 在「附件管理」上传 PDF 文件
2. 复制链接后，在文章中用 iframe 嵌入：

```html
<iframe
  src="/uploads/your-file.pdf"
  width="100%"
  height="700px"
  style="border:1px solid var(--border-default);border-radius:8px;"
></iframe>
```

### 上传 Word 文档

上传 `.docx` 文件时，系统会自动将其转换为 Markdown 文本。转换结果会在上传响应中返回，可以直接粘贴到编辑器中。

---

## 最佳实践

**组织建议：**
- 每篇笔记专注一个主题，篇幅控制在 2000~5000 字
- 大主题拆成系列文章，通过双向链接串联
- 善用二级标题（H2）构建清晰的目录结构

**写作建议：**
- 代码块一定要注明语言，便于高亮
- 重要概念用**加粗**标出
- 公式推导过程写完整，方便日后复习
- 每篇文章末尾可以加「参考资料」或「延伸阅读」

**标签建议：**
- 同一知识体系的文章使用相同标签，便于搜索
- 技术文章加上版本标签，如 `python-3.12`、`nextjs-14`
