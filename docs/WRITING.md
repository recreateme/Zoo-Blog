# ✍️ 写作指南

本文介绍如何在知识库中写作，包括 Markdown 语法扩展、Frontmatter 规范和本地同步工作流。

---

## 目录

1. [Frontmatter 规范](#1-frontmatter-规范)
2. [Markdown 语法扩展](#2-markdown-语法扩展)
3. [专题与标签](#3-专题与标签)
4. [在线编辑器使用](#4-在线编辑器使用)
5. [本地写作工作流](#5-本地写作工作流)
6. [附件插入](#6-附件插入)
7. [双向链接与知识图谱](#7-双向链接与知识图谱)

---

## 1. Frontmatter 规范

每篇 Markdown 文章以 YAML frontmatter 开头，格式如下：

```yaml
---
title: 文章标题（必填）
slug: my-note-slug        # 可选；默认用文件名
tags:                     # 必填，至少 1 个
  - llm
  - transformer
series:                   # 可选；一篇可属于多个专题
  - name: OpenCV 入门教程
    order: 12
  - name: 传统计算机视觉
    order: 3
subcategory: 第3章 图像滤波   # 可选章节名
cover: /images/covers/xxx.webp  # 可选封面
status: published         # draft | published
publishedAt: 2026-07-14
summary: |
  这里写一段 100~200 字的摘要。
outline:
  - 第一个要点
  - 第二个要点
# 已废弃：category（旧文仍可同步；公开站已改为 /series）
---

# 正文从这里开始
```

兼容旧格式：`series: OpenCV 入门教程` + `seriesOrder: 12`（或 `order`）仍可同步，入库后变为单专题成员。

### Frontmatter 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | ✅ | 文章标题 |
| `slug` | string | ❌ | URL id；默认取文件名 |
| `tags` | string[] | ✅ | 至少 1 个；空则同步时补「未贴标签」 |
| `series` | string 或 `{name, order}[]` | ❌ | 专题归属；多专题用数组 |
| `order` / `seriesOrder` | number | ❌ | 仅旧字符串 `series` 时的顺序 |
| `subcategory` | string | ❌ | 专题内章节名（展示用） |
| `cover` | string | ❌ | 封面路径，如 `/images/...` |
| `status` | enum | ❌ | `draft` 或 `published` |
| `publishedAt` | date | ❌ | `YYYY-MM-DD` |
| `summary` | string | ❌ | 摘要 |
| `outline` | string[] | ❌ | 文首要点 |
| `category` | string | ❌ | **已废弃**；旧文兼容读取 |

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

- 链接目标**已发布**时，渲染为可点击链接
- 目标不存在时，显示为虚线下划线提示
- 同步或保存后，系统会更新 `PostLink` 表，供 **知识图谱** 使用

> 图谱「笔记链接」视图仅展示**已发布**笔记之间的边；草稿中的链接不会出现在公开图谱中。

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

## 3. 专题与标签

公开站已**取消预设分类**，浏览入口为专题页 `/series` 与标签筛选。

### 标签

- **必填**，建议 3～6 个；用于搜索、图谱与首页筛选
- 后台「标签管理」可重命名、合并、删除

### 专题（学习路径）

一篇笔记可属于**多个**专题；同专题内用 `order` 排序。

```yaml
series:
  - name: OpenCV 入门教程
    order: 12
  - name: 传统计算机视觉
    order: 3
subcategory: 第3章 图像滤波   # 可选章节名
```

**展示效果：**

- 面包屑：`首页 > 专题 > OpenCV 入门教程 > 第3章 > 标题`
- 专题页：按 `order` 分页列表，支持 `?q=` 专题内搜索
- 侧栏：热门专题入口
- 文章页：所属专题 chips + 教程目录 / 上下篇

**约定：**

- 专题名在库中唯一；同步时按名称自动 `ensure` Series 记录
- `subcategory` 仅作章节展示，不再表示「分类下的子类」
- 旧 `category` + 字符串 `series` 仍可同步；迁移脚本已把旧分类建成同名专题

后台也可：上传笔记、专题管理、编辑器多选专题。上传笔记时，封面支持：

- **本地图片**：选择 JPG、PNG、WebP、GIF 或 AVIF（最大 8MB）
- **公网图片**：填写可直接访问的 `http(s)` 图片地址

两种来源都会在服务端校验、转换为 WebP，并保存到
`public/images/covers/`；Frontmatter 和数据库记录的是
`/images/covers/...` 项目路径。文章导入失败时，Markdown、数据库记录和新封面会一并回滚。

---

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

### 内容源策略（文件 vs 后台）

| 来源 | 标识 | 写入位置 | 同步行为 |
|------|------|----------|----------|
| **本地 MD** | DB 有 `filePath` | `content/` 目录 | 文件优先：同步覆盖 DB |
| **后台编辑器** | 无 `filePath` | 仅数据库 | 同步永不覆盖/删除 |

**推荐做法：**

- 日常写作用 Obsidian → rsync → 后台「从文件系统同步」
- 临时草稿可用后台编辑器；若要纳入 Git/rsync，请导出为 MD 放入 `content/`
- 删除文件绑定笔记时，建议同时删除 MD 文件，避免下次同步重新入库

---

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

# 与服务端 .env 中 SYNC_SECRET 一致
SYNC_SECRET="your-random-sync-secret-min-32-chars"

# 可选：同步上传附件（public/uploads）
SYNC_UPLOADS=false
LOCAL_UPLOADS_DIR="./public/uploads"
VPS_UPLOADS_DIR="/var/www/blog/public/uploads"
```

### 执行同步

```bash
# Linux / macOS：手动同步一次
./scripts/sync-local.sh

# 每 30 秒自动同步（写作期间）
watch -n 30 ./scripts/sync-local.sh
```

```powershell
# Windows：手动同步一次（需 OpenSSH；推荐安装 WSL 以使用 rsync）
.\scripts\sync-local.ps1
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

## 7. 双向链接与知识图谱

前台 **图谱** 页（`/graph`）将笔记关系可视化，写作时可通过以下字段影响展示：

| 写作行为 | 影响的图谱视图 |
|----------|----------------|
| `[[双向链接]]` | 「笔记链接」节点与边 |
| `tags`  frontmatter | 「标签关联」共现网络 |
| `publishedAt` + `status: published` | 「时间演化」按月累积 |
| `category` / `series` | 图谱页筛选芯片与专题下拉 |

### 三视图说明

1. **笔记链接** — 展示 `PostLink` 双向关系，适合梳理知识网络
2. **标签关联** — 同一篇笔记内的标签两两连线，发现主题聚类
3. **时间演化** — 拖动月份滑块或点击「播放」，观察网络如何随发布笔记增长

### 筛选（阅读图谱时）

- **分类芯片**：只显示某分类下的笔记（或标签元数据匹配的节点）
- **专题下拉**：按 `series` 字段过滤（笔记需设置系列名）
- **隐藏孤立节点**：去掉没有任何连线的节点

### 写作建议（面向图谱）

```yaml
---
title: OSPF 邻居建立
category: huawei-datacom
series: OSPF 专题          # 出现在专题筛选中
tags: [ospf, 路由, 华为]
status: published
publishedAt: 2024-06-01    # 决定时间演化中的出现月份
---

参见基础概念 [[ospf-overview]]。
与 [[BGP 路径选择]] 对比学习。
```

- 系列教程统一 `series` 名称，便于图谱按专题筛选
- 在相关笔记间多写 `[[链接]]`，链接视图更有意义
- 标签保持简洁一致（如统一用 `deep-learning` 而非混用 `DL`）

同步内容后刷新 `/graph` 即可看到更新。后台编辑保存也会更新链接表，但图谱数据在页面加载时拉取 API，刷新页面即可。

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
