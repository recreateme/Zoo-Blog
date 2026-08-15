---
title: LLM Agent 综述：方法论、应用与挑战
slug: llm-agent-survey-methods-apps-challenges
tags:
  - llm
  - agent
  - multi-agent
  - survey
  - rag
status: published
publishedAt: '2026-08-16'
summary: |
  基于 arXiv:2503.21460（2025-03）的 LLM Agent 综述笔记：从构建/协作/进化方法论，
  到评估与工具、安全隐私与伦理，再到领域应用与未来挑战。
series:
  - name: LLM Agent
cover: /images/covers/llm-agent-survey-methods-apps-challenges.png
---

# **综述 LLM Agent survey：关于方法论、应用与挑战**

> 原论文地址：https://arxiv.org/pdf/2503.21460
>
> 本笔记完成于2025年中，目前来看很多方法论也并不过时，遂录入

# **1、引言**

这是2025年3月的一篇Agent综述，这篇论文从LLM生态系统分为四个相互关联的维度：

- 代理方法论，涵盖Agent的构建、协作和演化； 

- 评估和工具，介绍benchmark、评估框架和工具； 

- 现实世界问题，有关安全、隐私和社会影响的关键问题； 

- 应用程序，突出显示部署 LLM 代理的不同领域。

![image-20251115095809679](/images/posts/llm-agent-survey-methods-apps-challenges/overview.png)



本文涉及的知识点太多，只能围绕论文大致分析总结，后面有机会在逐个细看。综述提供的是对Agent现有研究的一个总结，方便查漏补缺以及研究方向的启发。在写这篇笔记时，一些关于Agent工程上的方向，如context engineering没有在论文中体现。



# **2、Agent methodology**

从三个相互关联的维度来理解基于 LLM 的代理系统如下图所示：

- Agent构建：包括profile 定义、存储机制、规划功能和操作执行。
- Agent 协作：多Agent的协作方式，包括集中、分布、混合。
- Agent 进化：Agent能力的无监督提升，包括自我进化、多Agent协同进化、依赖外部资源进化。



![image-20251115104423834](/images/posts/llm-agent-survey-methods-apps-challenges/methodology.png)

​                                                                        										agent方法论的分类

## **2.1 Agent 构建**

本节讨论的是Agent的核心组件，包括：

- Agent profile 定义

- 记忆机制

- 规划能力

- 行动执行

### **2.1.1 Ageent profile**

**Agent 的 Profile（画像）用于定义 Agent 的操作身份、行为模式与决策边界，是塑造 Agent 行为的根基。包括静态和动态两种**

#### （1）Human-Curated Static Profiles（人工构建静态画像，当前主流）

特点：

- 由领域专家手动制定，规则明确、可解释性强
- 保证一致性、稳定性、合规性
- 易于构建标准化的角色分工体系
- 典型应用：多智能体协作、企业任务、软件开发 Agent

适用场景：

- **任务规范严格的系统**：如代码生成、金融分析、企业流程批处理
- **人与 Agent 协同**：明确角色、交互协议
- **需要可控与可审计性**的环境，如安全合规领域

代表性系统：

- **Camel / AutoGen / OpenAgents**
  - 采用 *固定角色（如 User Proxy / Assistant）+ 对话协议（Turn-taking）*
  - 通过结构化对话完成任务
- **MetaGPT / ChatDev / AFlow**
  - 用“公司组织架构”观点构建角色
  - 程序员、产品经理、架构师等角色**协作生成软件工程成果**

------

#### （2）**Batch-Generated Dynamic Profiles（批量生成动态的画像）**

**特点：**

- 自动化生成一批不同属性的 Agent
- 通过参数化方式注入“个性”、“背景”、“价值观”等控制变量
- 保持整体策略一致，但在个体间实现“多样性/异质性”
- 可以模拟真实人类群体的行为或互动模式

**适用场景：**

- 社会行为模拟、群体智能研究
- 生成模拟用户数据（如电商、教育、社交平台）
- 研究 emergent intelligence / multi-agent dynamics

**方法手段：**

- Prompt 模板生成（人格/背景/偏好变量）
- 从“latent space”中采样不同风格的初始状态
- DSPy 等框架可进一步对“Profile 参数”进行优化

**代表系统：**

- 人类行为模拟系统、模拟用户生成框架
  - 用不同配置的 Profile 控制 Agent 行为 → 形成集体模式
- DSPy
  - 通过参数优化强化 Profile 初始化，使行为更契合目标

#### （3）静态与动态 Profile 的区别

| 特性       | 静态 Profile       | 动态 Profile         |
| ---------- | ------------------ | -------------------- |
| 稳定性     | 高                 | 低（但可控）         |
| 多样性     | 低                 | 高                   |
| 可解释性   | 强                 | 中等                 |
| 应用       | 企业系统、可控任务 | 社会模拟、群智能     |
| 角色分工   | 明确               | 模拟真实社会的多样性 |
| 初始化方式 | 手工制定           | 模板生成 / 参数采样  |

#### （4）Agent profile的应用示例

示例 1：静态 Profile – 软件开发团队（ChatDev / MetaGPT）

固定角色：

- Product Manager：只描述需求
- Architect：生成系统设计
- Programmer：根据设计生成代码
- Tester：编写测试用例

行为协议：

- PM → Architect → Programmer → Tester
- 每个角色有固定 Prompt + 固定输入输出格式

特点：

- 可控、流程化
- 适合软件开发等“异步流水线任务”

------

示例 2：动态 Profile – 模拟 1000 个不同用户的购物行为

你可以生成如：

```
Personality: 高冲动消费
Income level: 中低收入
Shopping preference: 喜欢促销
Past experience: 曾多次退款
Risk tolerance: 高
```

另一位用户可能是：

```
Personality: 追求性价比
Income level: 高收入
Shopping preference: 高端品牌
Past experience: 很少退货
```

应用：

- 模拟电商用户
- 为推荐系统生成用户日志
- 研究群体行为（如羊群效应）

### 2.1.2 Agent Memory（上下文）

Memory 让 Agent 可以 **存储、组织和多时间尺度地检索信息**

**短期记忆**：用于当下的交互和推理

**长期记忆**：用于保留经验、技能、工具

**外部知识检索（RAG）**：进一步扩展可用信息

#### 1、短期记忆

应用：

- 对话历史
- 上下文
- 环境反馈
- 中间推理步骤

框架：

- **ReAct**：边推理边行动，存储「思考 + 动作」历史
- **ChatDev**：软件开发流程，多轮协作必须依赖历史状态
- **Graph of Thoughts**：多路径推理，其图结构本质就是短期记忆的并行扩展
- **AFlow**：自动化 workflow，状态就在短时记忆中流转

局限性：

**只能服务当前任务，任务结束就消失**

→ 不可复用，不会成为“经验”。

② **受限于 LLM 的上下文窗口**

→ 对话长了就要压缩、丢弃信息，否则性能下降。

③ **多轮交互深度有限，需要摘要和选择性存储**

→ 如langchain中的截断记忆或者摘要记忆



#### 2、长期记忆

长期记忆（LTM）是为了**让 Agent 能在不同任务之间积累知识、技能、工具**。

**（1）Skill Libraries — 技能库**

例子：

- **Voyager（Minecraft）**：自动生成可复用技能（如“建桥”）
- **GITM**：文本知识库，用工具形式存知识

LTM（技能） = “可调用的程序化能力”。

------

**（2）Experience Repositories — 经验库**

例子：

- **ExpeL**：利用经验池提炼策略
- **Reflexion**：记录失败经验，下一次自动召回

LTM（经验） = “过往成功失败的记忆”，类似 RL 的 replay buffer。

------

**（3）Tool synthesis frameworks — 工具生成系统**

例子：

- **TPTU**：基于任务自动合成工具
- **OpenAgents**：自己扩展自己的工具箱

LTM（工具）= Agent 自我演化的基础能力。



**长期记忆的核心价值**是：将碎片化推理结果变成可复用资产。

实现长期记忆主要涉及三个核心环节：**存储、检索和更新**。



#### 3、长期记忆的实现

1. 存储

这是记忆的“仓库”。它必须是一个持久化的、可扩展的存储系统。

- **向量数据库**：这是目前最主流的解决方案。
  - **原理**：将信息（如文本、图片）通过嵌入模型转换为高维向量（即 embeddings），然后存储这些向量。这种方式的巨大优势是支持**语义搜索**，而不仅仅是关键词匹配。
  - **代表产品**：Pinecone, Chroma, Weaviate, Qdrant, Milvus。
- **传统数据库**：
  - **关系型数据库**：如 PostgreSQL, MySQL。可以结合其扩展插件（如 PGVector）来同时存储结构化数据和向量。
  - **NoSQL 数据库**：如 MongoDB，用于存储非结构化的文档或键值对数据。
- **文件系统**：最简单的形式，直接将记忆以文本或结构化文件（如 JSON, CSV）的形式保存在磁盘上。适用于简单场景，但检索效率低下。

**通常，一个高效的记忆系统会采用混合架构：用向量数据库存储记忆的“语义核心”，用关系型数据库或键值存储来关联记忆的元数据（如创建时间、来源、重要性分数等）。**

2. 检索

这是记忆系统的“搜索引擎”。当Agent需要时，如何快速找到最相关的记忆？

- **基于嵌入的语义检索**：
  1. 将用户的当前查询或情境也通过同样的嵌入模型转换为向量。
  2. 在向量数据库中进行**相似度搜索**（如余弦相似度），找到与当前情境最相关的记忆向量。
  3. 返回对应的原始记忆文本。
- **混合检索策略**：
  - **时间加权**：给近期的记忆更高的权重，因为近期记忆通常更具相关性。
  - **重要性加权**：在存储记忆时，让模型（如 GPT-4）为每段记忆打一个重要性分数（例如，从 1 到 10），检索时优先考虑高分记忆。
  - **元数据过滤**：例如，只检索与“某特定项目”或“某个用户”相关的记忆。
- **检索-排序管道**：先通过向量检索出一个较大的候选记忆集，然后再用一个更精细的排序模型对这些记忆进行重新排序，选出Top-K个最相关的记忆。

3. 记忆的更新与管理

记忆不是只进不出的，它需要维护，否则会变得臃肿和无效。

- **记忆总结/压缩**：
  - **当记忆容量快满时**：Agent可以将一系列相关的、较旧的记忆作为上下文，让大模型生成一段高度凝练的总结，用这段总结来替代原有的大量细节。
  - **例如**：将“周一完成了A模块，周二调试了B接口，周三修复了C bug”总结为“本周完成了A模块并与B接口成功联调”。
- **记忆遗忘/淘汰**：
  - **基于时间**：自动删除或归档过于陈旧的记忆。
  - **基于访问频率**：淘汰那些很少被检索到的记忆。
  - **基于重要性**：删除重要性分数低的记忆。
- **记忆冲突与修正**：
  - 当新获取的信息与旧记忆矛盾时，系统需要有能力识别并解决冲突。例如，通过用户反馈或更可靠的信源来修正错误的记忆。

#### 4、RAG记忆

**1）静态知识检索**

- RAG（文本文档）
- GraphRAG（知识图谱）

相当于“长期静态知识库”。



**（2）交互式检索**

例：

- **Chain of Agents**：多个 Agent 互相触发检索

动态查询，像人类 Ask Google。

------

**（3）推理融合检索**

例：

- **IRCoT / Llatrieval**：在一步一步推理中动态检索
- **KG-RAR / DeepRAG**：构建子图或决定何时检索

“边思考边查资料”。



**论文的观点：RAG 在 Agent 架构中，实际上已经演化为一种可扩展的长期记忆逻辑。**

#### **5、Memory总结**

**Agent 记忆 = ST + LT + RAG**

论文想表达的最终概念：

> **ST-Memory 与 LLM 上下文强相关，是临时的**
>  **LT-Memory 与 Agent 本身能力相关，是持久的**
>  **RAG 是外部扩展，是无限的**

三者区别如下：

| 类别         | 来源       | 持久性       | 用途             | 典型技术                     |
| ------------ | ---------- | ------------ | ---------------- | ---------------------------- |
| **短期记忆** | 上下文窗口 | 任务结束消失 | 连续推理         | ReAct / ToT / ChatDev        |
| **长期记忆** | 框架内部   | 可复用       | 技能、经验、工具 | Voyager / Reflexion / MemGPT |
| **RAG 记忆** | 外部知识库 | 扩展性强     | 补充事实知识     | RAG / GraphRAG / DeepRAG     |

最终构成“Agent 认知三件套”：

> **连续性（ST） + 可复用性（LT） + 可扩展性（RAG）**



### **2.1.3 planning Capability（规划能力）**

LLM Agent 的规划能力由任务分解与反馈驱动迭代共同构成。前者将复杂任务转化为可操作的子步骤，而后者通过环境、人类、模型自省与多智能体协作的反馈动态修正推理路径，使得 Agent 能够形成一个 “规划—执行—反思—再规划” 的闭环。这种结合链式推理、树状探索与试错修正的 hybrid planning framework，使 Agent 能够在复杂真实场景中展现高鲁棒性与高成功率。


换句话说，一个真正“智能”的 Agent 不仅是生成答案，而是要像人一样：

- 能把复杂任务拆解成步骤（Task Decomposition）
- 能在执行中根据反馈调整计划（Feedback-driven Iteration）
- 能纠正犯过的错误（Backtracking & refinement）
- 能探索不同路径并选择最佳方案（Tree search / ensemble）



LLM Agent的规划能力来源：任务分解、反馈。任务分解是微调模型本身具备的知识，反馈帮助模型更了解内部和外部的环境并作出合适的反应。

#### （1）Task Decomposition（任务分解）

论文将任务分解分成两种：

**1）Single-path chaining（单路径链式规划）**

本质：像写脚本一样顺着一个方向一步步推理。

**① 静态链式规划（Plan → Solve）**

典型方法：

- Zero-shot CoT

- Plan-and-solve 方法

- ReAct（部分动态）

  > 这里我最开始都疑惑为什么有ReAct，后来想明白了，因为 **ReAct 的规划结构上仍然是“单路径顺序展开的链式推理”**。
  >
  > ```
  > Thought → Action → Observation → Thought → Action → Observation ...
  > ```
  >
  > 虽然包含了观察反馈环节，但是整个推理路径是直线式单路径的，“链式规划”这一节主要强调任务分解后的计划结构，而非是否包含推理反馈。

流程：

1. 让模型先生成一个“完整计划”
2. 再根据该计划逐步执行

**优点：**简单、易实现

**缺点：**

- 路径单一，容错差
- 计划出错 → 后续全部错误（Error Accumulation）
- 无法适应环境变化

相当于死板执行一条线路。

**2）Multi-path tree expansion（树结构多路径规划）**

本质：模拟人类“试错、回退、重新选择”的思考方式。

核心代表：

- **Tree-of-Thought (ToT)**
- **Monte Carlo Tree Search (蒙特卡洛树搜索，MCTS)** + LLM
- **反思/重试类方法（Reflexion）**
- 论文中未提到，如横向展开的多个子任务并行执行（如调用同一个mcp或者langchain的工具，同时查询成都、武汉的天气信息）

树状规划的优势：

- 允许 backtracking（回退到上个节点）
- 探索多个候选解
- 在复杂任务上更可靠（如数学推理、多步骤搜索、游戏AI）

在早期多个论文中反映，真实任务中链式经常失败，树式更稳。



#### （2）Feedback-driven Iteration（基于反馈驱动的迭代）

反馈是 Agent 规划能力的第二大核心。

**反馈来源四类：**

| 反馈来源                         | 说明                          | 典型应用                      |
| -------------------------------- | ----------------------------- | ----------------------------- |
| **1. 环境反馈**                  | 来自真实/模拟环境的动作结果   | 机器人、强化学习              |
| **2. 人类反馈**                  | 人类观察、纠错、Thumb-up/down | RLHF, Aligning                |
| **3. 模型内省（Introspection）** | Agent 自己审查自己的错误      | Self-refine, Self-consistency |
| **4. 多智能体协作反馈**          | Agent 之间相互批评/投票       | Debate, Agent-committee       |



#### **（3）Hybrid：完整的“规划-执行循环”**

> 以上两种属于LLM Agent经典的范式，现代成熟的框架与通常采用混合的方式，博采众长。

可总结为一个统一闭环：

**1）规划阶段：**

- 生成任务结构：链式或树式
- 拆解子任务

**2）执行阶段：**

- 顺序执行 / 并发执行
- 与环境交互

**3）反馈阶段：**

- 观察失败点
- 进行反思（Self-critique）
- 参考他人（Multi-agent debate）

**4）重新规划：**

- 回退（Backtracking）
- 更新任务分解
- 调整目标

→ 直到成功完成任务。

这是现代 Agent 的核心架构（如 OpenAI Swarm、Meta Agent Teaming、AutoGPT 新版本等）。

> 后面有时间会对不同的Agent开发框架的进行源码解析....



### 2.1.4 Action Execution（Agent 的动作执行）

在完成Agent的角色定位、赋予记忆能力，并拥有规划能力后，Agent的执行能力是应用落地的关键，总体分为两大类：

**（1）Tool Utilization（工具调用）**

**（2）Physical Interaction（物理交互 / 具身智能，当前很火的一个研究方向）**

比较直观的理解就是，工具调用可以通过**（API / langchain Tool / MCP）**等方式实现软件层面的功能调用，具身智能通过**（传感器 / 机器人）**等在现实中执行动作。（具身智能这部分不太熟悉，参考论文部分内容以及ChatGPT老师）

#### （1） **Tool Utilization（工具使用）**

工具调用是Agent 最重要的技术之一，它拓展了 LLM 能力的边界，如：

- 精准计算能力（calculator tool）
- 实时数据能力（API 调用）
- 代码能力（code interpreter）
- 搜索、多模态处理等能力

论文将工具调用拆成两部分：



**✔ 1.1 Tool-use decision（是否使用工具）**

LLM 要先判断当前任务是否需要工具？如果依赖大模型本身的能力置信度较低，或模型不具备相关能力，即需要选择合适的功能作为模型的“手脚”。这就是为什么 GPT-o 系列、DeepSeek 工具调用中经常加入 “self-reflection/confidence check”。



**✔ 1.2 Tool selection（选择哪个工具）**

- 有哪些可用工具？（工具文档理解）
- 当前任务最适合哪个？
- 是否需要多工具协同（multi-tool workflow）？

论文中指出，LLM 工具调用错误很多时候不是能力问题，而是**工具文档写得太复杂、太长导致模型理解困难**。

因此，需要通过规范的形式让模型理解，OpenAI 的 function calling JSON Schema 简化其实就是为了这个目的。通过标准化的工具描述提高工具调用的准确性。在function calling 和 MCP 的template、server、resource都需要合适的描述。

目前主流的工具描述标准如下：

```json
{
  "name": "search_products",
  "description": "在电商平台搜索商品",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "搜索关键词，要具体明确"
      },
      "category": {
        "type": "string", 
        "enum": ["electronics", "clothing", "books", "home"],
        "description": "商品分类"
      },
      "price_range": {
        "type": "object",
        "properties": {
          "min": {"type": "number", "description": "最低价格"},
          "max": {"type": "number", "description": "最高价格"}
        },
        "description": "价格范围筛选"
      },
      "in_stock_only": {
        "type": "boolean",
        "description": "是否只显示有库存商品"
      }
    },
    "required": ["query"]
  }
}
```



#### （2） **Physical Interaction（物理交互 / Embodiment）**

这是面向机器人、具身智能（Embodied AI）的 Agent 功能。这部分

强调：

- LLM 需要理解硬件限制（如机械臂 DOF、速度限制）
- 需要从现实环境中获取反馈（视觉、触觉、声音）
- 需要结合“社会知识”（例如人类行为、互动规范）
- 可能与其他 Agent 协同执行复杂任务（multi-agent robotics）

论文指出：

> 在真实世界中执行动作比在软件世界复杂得多，需要结合硬件、环境反馈、共同体知识等。

典型应用包括：

- 家用机器人（取物、清洁）
- 工业机械臂任务规划
- 多机器人协作
- 现实世界导航（如 RoboGPT）

它的难点包括：

- 感知不确定性（图像噪声、传感器误差）
- 执行动作不可逆（机械操作失败可能造成损坏）
- 需要持续闭环反馈（RL、MCTS）

因此，物理交互比工具调用更困难，是 Agent 技术最终走向 AGI 的关键路径。

---

## 2.2 Agent协同（多Agent系统）

本节讨论的是**多Agent系统的协作架构**，分成 3 大类：

1. **Centralized Control（集中式控制）**
2. **Decentralized Collaboration（去中心协作）**
3. **Hybrid Architecture（混合架构）**

三者的本质区别在于：
 **谁在做决策？谁与谁沟通？如何合并结果？**

------

###  **2.2.1 Centralized Control（集中式控制）**

 **本质：所有智能体由一个“中央大脑”控制。**

整个系统结构呈 **树状（STAR topology）**：

```
           Controller（中央控制器）
           /     |     \
       AgentA  AgentB  AgentC
```

所有任务都由 Controller 分解、分配、整合。

 **优点**

- 高度可控
- 易于保证质量（适合工业/科研）
- 结构清晰，可复现、可追踪
- 不会出现多智能体乱聊的情况

 **缺点**

- 单点瓶颈：Controller 会成为性能瓶颈
- 灵活性较低
- 系统扩展性差

------

 **两条技术路线**

**① Explicit Controller（显式控制器）**

特点：

- 有一个真正的“主控 Agent”
- 其他 Agent 只能与 Controller 对话

典型系统：

| 系统            | 贡献                                 |
| --------------- | ------------------------------------ |
| **Coscientist** | 人类作为控制器，分配任务给实验智能体 |
| **LLM-Blender** | 控制器融合多个 Agent 的回答          |
| **MetaGPT**     | 软件公司式组织：PM → 设计 → 程序员   |

**核心思想：**
 把多智能体看成一家公司，Controller 是 CEO。

------

**② Differentiation-based（隐式角色分化）**

特点：

- 使用 **同一个模型 + 不同 prompt**
- 让模型“扮演”不同角色（planner、tool-agent、review-agent）

典型系统：

| 系统               | 贡献                                  |
| ------------------ | ------------------------------------- |
| **AutoAct**        | 一个模型通过不同 prompt 执行不同功能  |
| **Meta-Prompting** | 用 meta-prompt 让同一模型扮演多个角色 |

**本质：用 prompt 做“虚拟多智能体”模拟真实多智能体。**

------

###  **2.2.2 Decentralized Collaboration（去中心协作）**

 本质：**没有中央控制器，智能体之间平等交流。**

结构呈 **网状（graph topology）**：

```
A —— B —— C
 \    |    /
      D
```

智能体互相观察、互相改写、互相交流。

 **优点**

- 不存在单点瓶颈
- 更灵活，可扩展到很多智能体
- 适合需要辩论、头脑风暴、博弈的场景

 **缺点**

- 不稳定（可能发散）
- 协作质量难以保证
- 需要更复杂的共识机制（Voting、Refinement）

------

 **两类方式**

**① Revision-based（迭代修正模式）**

特点：

- 不对话
- 每个 Agent 只修改前一个 Agent 的结果
- 最终多轮 refinement 收敛到更好的答案

典型系统：

| 系统          | 贡献                                       |
| ------------- | ------------------------------------------ |
| **MedAgents** | 医学问题，通过多专家 sequential refinement |
| **ReConcile** | 互相修正回答并投票                         |
| **METAL**     | 文本和图像两个智能体互相修图/修文本        |

**本质：像多人共同编辑同一份文档。**

------

**② Communication-based（基于交流/辩论）**

特点：

- Agents 之间直接讨论
- 显式暴露推理过程
- 适合“多观点融合、多专家讨论”

典型系统：

| 系统        | 特点                           |
| ----------- | ------------------------------ |
| **MAD**     | 解决“推理塌缩”，鼓励更多探索   |
| **MADR**    | 批判式推理，对错误观点进行反驳 |
| **MDebate** | 辩论风格，交替固执与协作       |
| **AutoGen** | 群聊式 Agent 协作框架          |

**本质：让智能体像“一个专家委员会”那样工作。**

------

### 2.2.3 Hybrid Architecture（混合架构）**

本质：结合集中式 + 去中心协作的优点。

目标：

- 既要稳定（集中）
- 又要灵活（去中心）

典型结构：

- 总体由 Controller 控制
- 子任务在局部由多个 Agent 自组织处理

例如：

```
                Controller
        /           |           \
 Team A(team chat) Team B(team chat) Team C(team chat)
```

------

 **两类混合结构**

**① Static Systems（固定拓扑）**

特点：

- 系统结构固定设计
- 不随任务变化

典型系统：

| 系统      | 贡献                                |
| --------- | ----------------------------------- |
| **CAMEL** | 组内去中心、组间集中式              |
| **AFlow** | 三层层级：战略 → 战术 → 执行        |
| **EoT**   | 规定 BUS、STAR、TREE、RING 拓扑模式 |

这些适合工业落地（可控性强）。

------

**② Dynamic Systems（动态可重构拓扑）**

特点：

- 系统结构根据任务自动调整
- 使用可训练的图结构 / 拓扑优化

典型系统：

| 系统           | 贡献                                     |
| -------------- | ---------------------------------------- |
| **DiscoGraph** | 训练图结构，动态建立智能体间连接         |
| **DyLAN**      | 计算“Agent Importance Score”决定连接方式 |
| **MDAgents**   | 根据任务复杂度动态决定是否多智能体合作   |

**这是未来趋势：智能体之间的连接由神经网络训练出来，而不是人类手工设计。**

------

### **2.2.4 三类架构的核心差异（一张图总结）**

| 架构类型 | 决策方式            | 交流方式               | 优点                 | 缺点               | 适用场景             |
| -------- | ------------------- | ---------------------- | -------------------- | ------------------ | -------------------- |
| 集中式   | 由 Controller 决策  | 单向：Agent→Controller | 稳定、可控、高质量   | 不灵活、可扩展性差 | 工程、科研、自动化   |
| 去中心   | 所有 Agent 自组织   | 双向多智能体对话       | 灵活、能融合不同观点 | 不稳定、可能发散   | 辩论、创意、探索     |
| 混合     | Controller + 自组织 | 局部自组织，整体受控   | 平衡可控与灵活       | 设计复杂           | 大型系统、复杂任务链 |

------

### 2.2.5 三类架构代码示例

```python
# multiagent_examples.py
import asyncio
import random
from collections import defaultdict
from typing import Any, Dict, List

# -------------------------
# 基础组件：Agent / MessageBus / Controller
# -------------------------
class MessageBus:
    """简单消息总线：订阅并广播消息（用于去中心协作示例）"""
    def __init__(self):
        self.subscribers = []

    def subscribe(self, agent):
        self.subscribers.append(agent)

    async def broadcast(self, sender, msg_type, payload):
        # 广播给所有订阅者（包括发送者也可观察）
        for a in self.subscribers:
            # 异步通知
            asyncio.create_task(a.on_message(sender, msg_type, payload))

class Agent:
    def __init__(self, name: str, bus: MessageBus = None):
        self.name = name
        self.bus = bus
        if bus:
            bus.subscribe(self)

    async def perform(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行任务的最小 API：
        任务格式示例: {"type": "weather", "city": "Beijing"}
        返回: {"agent": name, "city": city, "result": ...}
        """
        task_type = task.get("type")
        if task_type == "weather":
            return await self._fetch_weather(task["city"])
        elif task_type == "compute":
            # 示例: 简单加法
            await asyncio.sleep(0.1)
            res = sum(task.get("nums", []))
            return {"agent": self.name, "result": res}
        else:
            await asyncio.sleep(0.1)
            return {"agent": self.name, "result": None}

    async def _fetch_weather(self, city):
        # 模拟延迟与不确定性
        await asyncio.sleep(random.uniform(0.1, 0.5))
        temp = random.randint(-5, 35)
        cond = random.choice(["Sunny", "Cloudy", "Rain"])
        return {"agent": self.name, "city": city, "weather": f"{cond}, {temp}°C"}

    async def on_message(self, sender, msg_type, payload):
        # 去中心化时会被覆盖或扩展
        print(f"[{self.name}] received message from {sender}: {msg_type} -> {payload}")

class Controller:
    def __init__(self, name="controller"):
        self.name = name

    async def distribute_and_collect(self, agents: List[Agent], tasks: List[Dict[str,Any]]):
        """
        简单的集中式分发：一一对应分派任务（或按策略），并等待结果合并。
        """
        print(f"[{self.name}] distributing {len(tasks)} tasks to {len(agents)} agents")
        # 把 tasks 分配到 agents（简单轮询）
        jobs = []
        for i, task in enumerate(tasks):
            a = agents[i % len(agents)]
            jobs.append(asyncio.create_task(a.perform(task)))
        results = await asyncio.gather(*jobs)
        print(f"[{self.name}] collected results")
        return results

# -------------------------
# A: 集中式控制 示例
# -------------------------
async def centralized_example():
    print("\n=== Centralized Control Example ===")
    agents = [Agent(f"Worker-{i}") for i in range(3)]
    controller = Controller()

    # 任务：查询多个城市天气
    cities = ["Beijing", "Shanghai", "Guangzhou", "Shenzhen", "Wuhan"]
    tasks = [{"type":"weather", "city":c} for c in cities]

    results = await controller.distribute_and_collect(agents, tasks)

    # Controller 汇总
    for r in results:
        print(" ->", r)

# -------------------------
# B: 去中心协作 示例（revision-based + communication-based 混合演示）
# -------------------------
class DecentralAgent(Agent):
    def __init__(self, name, bus: MessageBus):
        super().__init__(name, bus)
        # 存储本地观察到的候选答案
        self.candidates = defaultdict(list)

    async def propose(self, task_id: str, task: Dict[str,Any]):
        # 生成一个候选解（本地快速估计）
        res = await self.perform(task)
        # 广播 proposal 给其它 agent
        await self.bus.broadcast(self.name, "proposal", {"task_id": task_id, "result": res})
        # 也把自己看到的候选加入本地
        self.candidates[task_id].append(res)

    async def on_message(self, sender, msg_type, payload):
        # 接收 proposal 并存储
        if msg_type == "proposal":
            tid = payload["task_id"]
            self.candidates[tid].append(payload["result"])
            # 简单策略：如果接收到 >2 个候选，则对它们进行投票/选择最常见
            if len(self.candidates[tid]) >= 3:
                chosen = self._aggregate(self.candidates[tid])
                print(f"[{self.name}] aggregated for {tid}: {chosen}")
                # 广播 final decision（revision-based 的最后一步）
                await self.bus.broadcast(self.name, "final", {"task_id": tid, "decision": chosen})
        elif msg_type == "final":
            # 收到最终决策，打印
            print(f"[{self.name}] sees final decision for {payload['task_id']}: {payload['decision']}")

    def _aggregate(self, candidates: List[Dict[str,Any]]):
        # 简单多数投票/按城市+weather字符串计数
        counts = {}
        for c in candidates:
            key = f"{c.get('city')}|{c.get('weather')}"
            counts[key] = counts.get(key, 0) + 1
        best = max(counts.items(), key=lambda x: x[1])[0]
        city, weather = best.split("|")
        return {"city": city, "weather": weather}

async def decentralized_example():
    print("\n=== Decentralized Collaboration Example (proposal + revision + final) ===")
    bus = MessageBus()
    agents = [DecentralAgent(f"Dec-{i}", bus) for i in range(4)]

    # 一个任务：查询武汉天气 (task_id 用于追踪)
    task = {"type":"weather", "city":"Wuhan"}
    # 并行每个 agent 提案（proposal）
    await asyncio.gather(*(a.propose("t-001", task) for a in agents))

    # 等待一些时间让提案和聚合完成
    await asyncio.sleep(1.0)

# -------------------------
# C: 混合架构 示例（Controller 管理多个小团队，团队内部去中心协作）
# -------------------------
class TeamAgent(DecentralAgent):
    """团队内的 agent：继承去中心化 agent，但会响应团队内的最终决策"""
    pass

async def hybrid_example():
    print("\n=== Hybrid Architecture Example ===")
    bus_team_a = MessageBus()
    bus_team_b = MessageBus()

    # 每个团队有 3 个 agent，通过内部 bus 协作
    team_a = [TeamAgent(f"A-{i}", bus_team_a) for i in range(3)]
    team_b = [TeamAgent(f"B-{i}", bus_team_b) for i in range(3)]

    controller = Controller("MasterController")

    # Controller 分配两组任务，分别交给两个团队去内部协作并产生“最终决策”
    tasks_team_a = [{"type":"weather", "city":c} for c in ["Beijing", "Tianjin"]]
    tasks_team_b = [{"type":"weather", "city":c} for c in ["Shenzhen", "Guangzhou"]]

    # 步骤：
    # 1) Controller 告知每个团队开始对内部 tasks 做提案与修正（内部去中心化）
    async def run_team(team_bus, agents, tasks, prefix):
        # 让团队内所有 agent 对每个 task 提案
        for i, task in enumerate(tasks):
            tid = f"{prefix}-t{i}"
            await asyncio.gather(*(a.propose(tid, task) for a in agents))
            # 稍等让最终决策产生（在实际系统中会有更强的同步机制）
            await asyncio.sleep(0.6)
            print(f"[{prefix}] finished task {tid}")

    # 并行启动两个团队（团队内部自组织）
    await asyncio.gather(
        run_team(bus_team_a, team_a, tasks_team_a, "TeamA"),
        run_team(bus_team_b, team_b, tasks_team_b, "TeamB"),
    )

    # 最后 Controller 收集两队产生的 final decisions（这里简化：假设每队会广播 final）
    await asyncio.sleep(0.5)
    print("[MasterController] All teams finished. Controller can aggregate team-level outputs if needed.")

# -------------------------
# main：顺序运行三个示例
# -------------------------
async def main():
    await centralized_example()
    await decentralized_example()
    await hybrid_example()

if __name__ == "__main__":
    asyncio.run(main())

```

> `Agent.perform` 可以扩展为调用 API、数据库、机器人控制接口等。需要在工具选择上加入资格判断与权限控制（参考论文里提到的 tool selection）。在生产系统中，除了基本功能外，还需要考虑限速、鉴权、沙箱执行（避免任意代码执行风险）。

### 2.2.6 三种协同方式的框架选择

根据目前主流的Agent开发框架特点，针对三种架构的推荐框架如下：

| 架构类型       | 最成熟推荐框架                    | 可用但次优              | 不适合                          |
| -------------- | --------------------------------- | ----------------------- | ------------------------------- |
| **集中式控制** | **LangGraph，CrewAI**             | **MetaGPT，AutoGen**    | smolagents                      |
| **去中心协作** | **Autogen**                       | MetaGPT                 | LangGraph, CrewAI**             |
| **混合架构**   | AutoGen + 自定义Planner, SuperAGI | LangGraph（需扩展设计） | smolagents，dify（单Agent为主） |

---

## 2.3 Agent Evolution

> 关于这一节的内容属于是很前沿了，与普通的应用相差较远，内容基本照搬论文和AI总结，有余力再来细看。本节最核心的观点：LLM Agents 的进化已不依赖传统大规模人工标注，而是由模型内部 + 多模型交互 + 外部世界反馈形成闭环，呈现类生物进化的特征。

这一节主要围绕极低甚至没有人工监督的情况下的Agent进化，包括：Agent自我改进、多Agent交互进化、通过外部资源进化，下表总结了一部分相关研究论文

![image-20251118100732964](/images/posts/llm-agent-survey-methods-apps-challenges/evolution.png)

### **2.3.1 Autonomous Optimization and Self-Learning（自主优化 & 自主学习）**

主题：**单个 LLM 内部通过自我生成的数据、自我检查、自我激励产生“内源进化”能力。**

**1. 自监督学习（Self-Supervised）→ 自主生成数据、自适应训练**

**代表工作：**

- **Self-Evolution Learning (SE)**：动态调整掩码方式、token 难度、学习策略。
- **Evolutionary Optimization**：模型合并 / 微调的进化式策略（基因交叉、突变）。
- **DiverseEvol**：在指令微调中通过多样性筛选和自我生成提升数据质量。

**关键贡献：**

- 降低对人工标注依赖
- LLM 可以“自己生成训练数据”
- 实现持续、轻量级自我增强（Self-boosting）

------

**2. 自我反思与自我纠错（Self-Reflection / Self-Correction）**

**代表工作：**

- **SELF-REFINE**：LLM 生成答案，然后自我审阅、修改、迭代提高质量。
- **STaR / V-STaR**：模型自己训练推理过程（先 reasoning 再 verify 再强化）。
- **Self-verification techniques**：模型基于历史 reasoning 记录检查错误。

**关键贡献：**

- 降低幻觉
- 从结果 → 推理过程双维度实现自我修复
- 不需要额外标注数据即可提升 reasoning

------

**3. 自我奖励（Self-Rewarding）+ 自主强化学习（Self-RL）**

**代表工作：**

- **RLC**：evaluation–generation gap 的强化学习方法
- **Contrastive Distillation**：模型用自身 reward 进行对比式学习
- **Self-reward generation frameworks**

**关键贡献：**

- 模型能构造“奖励信号”
- 不依赖人工 reward model
- 让 LLM 具备“自我激励”的 RL 机制

**小结：2.3.1 是“单体 LLM 的自我迭代机制” → 自我生成、自我检查、自我奖励。**

------

### **2.3.2 Multi-Agent Co-Evolution（多智能体共同进化）**

主题：多个 LLM 之间通过 **协作（合作）** 和 **竞争（对抗）** 达成进化，类似“群体进化”。

分成两类：

------

**1. Cooperative Learning（合作式共同进化）**

**代表工作：**

- **ProAgent**：推理队友意图，动态协作
- **CORY**：借助 RL 的多智能体协作框架
- **CAMEL**：角色扮演式双 Agent 自主协作

 **贡献：**

- 多 agent 之间可以通过交流共享知识
- 提高策略稳定性和 zero-shot 协作能力
- 让 LLM 有“团队智能”（collective intelligence）

------

**2. Competitive / Adversarial Co-evolution（竞争式进化）**

**代表工作：**

- **Red-team LLMs**：对抗式生成漏洞、挑战主模型
- **Multi-agent Debate (MAD)**：多代理辩论提高 reasoning
- **Du et al. 的多代理辩论框架**：角色对立、互相审查、提升逻辑性

**贡献：**

- 对抗 → 更好的鲁棒性
- 辩论 → 更准确推理
- 模型通过“博弈”增强结构化思维

------

**小结：2.3.2 强调 LLM 在群体互动中进化，而不是单独进化。**

------

### **2.3.3 Evolution via External Resources（外源资源驱动的进化）**

主题：模型利用**外部知识、工具、环境反馈**来提升能力 —— 也就是“外源性学习”。

分成两类：

------

**1. Knowledge-Enhanced Evolution（结构化知识增强）**

**代表工作：**

- **KnowAgent**：约束行动路径，减少幻觉
- **WKM（世界知识模型）**：结合专家知识 + 真实数据

**贡献：**

- 获取准确的外部知识
- 利用知识约束决策，提升可靠性
- 更适用于复杂任务和规划

------

**2. External Feedback-Driven Evolution（外部反馈驱动）**

**代表工作：**

- **CRITIC**：模型生成答案 → 工具执行 → 工具给反馈 → 修正
- **STE**：试错 + 想象（imagination）+ 记忆
- **SelfEvolve**：执行代码并利用报错反馈来更新输出

**贡献：**

- 将“外部工具反馈 → 模型学习”闭环化
- 实现自动调试、自主改进
- 适用于代码生成、工具使用、长期任务

------

**小结：2.3.3 强调 LLM 借助外部资源（知识库、工具、执行环境）进化，补全模型内部不擅长的领域。**

### **2.3.4 三部分关系总结（核心概念图）**

```
            ┌──────────────────────┐
            │   2.3 自主进化（Evolution） │
            └──────────────────────┘
                       │
 ┌─────────────────────┼─────────────────────┐
 │                     │                     │
▼                     ▼                     ▼
Self-Learning     Multi-Agent           External
单体内部进化        群体协同进化            资源驱动进化

• 自监督             • 合作                   • 知识库增强
• 自反思             • 对抗辩论               • 工具执行反馈
• 自奖励             • 群体协作策略           • 环境试错学习
```

三者对应 *内源性、群体性、外源性* 三种“智能体演化来源”。

------



# 3、Evaluation and Tool

这一节探讨了支持 LLM  Agent开发、评估和部署的benchmark、数据集和工具的全面概况。在 3.1 节中研究评估方法，涵盖一般评估框架、特定领域评估系统和协作Agent的评估方法。在 3.2 节中讨论工具生态系统，包括 LLM Agent使用的工具、Agent本身创建的工具以及用于部署代理系统的基础设施。

> **LLM Agent 的发展推动了评测体系从简单的“任务成功率”转向：**
>  **① 多维认知能力、② 专业场景模拟、③ 多智能体协作系统的整体性评估。**

## 3.1 评估基准和数据集

### **3.1.1 通用评估框架（General Assessment Frameworks）**

这一节重点指出：

> **传统 NLP benchmark（如 MMLU、GSM8K、BBH）不足以评估 LLM-Agent，因为 Agent 涉及行动、交互、规划、工具使用、环境适配、UI/网页操作等能力。**

因此研究者开发了新一代多维度体系：

------

**（1）多维能力评估（Multi-dimensional Capability Assessment）**

这些基准的共同特点：

- 跨任务、多环境
- 强调 **工具调用、规划、执行能力**
- 更关注 **行为轨迹、交互链路** 而非只看结果

主要代表：

| Benchmark                    | 贡献点                                               |
| ---------------------------- | ---------------------------------------------------- |
| **AgentBench**               | 8 个交互环境，面向复杂推理与工具使用能力             |
| **Mind2Web**                 | 真实世界 137 网站，覆盖 31 个领域，用于 Web 代理评估 |
| **MMAU**                     | 3000+ 跨领域任务，构建五大核心能力评估结构           |
| **BLADE**                    | 面向科学研究（如化学、材料）评估专家决策流程         |
| **VisualAgentBench**         | GUI 操作、视觉交互、设计任务的统一评测               |
| **Embodied Agent Interface** | 面向机器人与具身智能，提供细粒度错误分类             |
| **CRAB**                     | 跨平台、图形环境、多任务（提供统一 Python API）      |

**总结意义**：

这些 benchmark 使得研究者可以细分能力维度，比如：

- 情境理解
- 工具调用
- 环境感知
- UI/网页操作
- 长序列规划
- 纠错能力

这种“认知能力图谱（Capability Mapping）”是未来 Agent 评测的核心趋势。

------

**（2）动态与自进化评测（Dynamic and Self-evolving Evaluation）**

动机：基准越流行越容易“被刷分”（Benchmark Overfitting）。

因此出现了“自进化”benchmark：

| Benchmark                             | 主要贡献                                    |
| ------------------------------------- | ------------------------------------------- |
| **BenchAgents**                       | 用 Agent 自动生成新的 benchmark，提升多样性 |
| **Benchmark self-evolving**           | 提出 6 种场景重写策略，动态消除捷径偏差     |
| **Revisiting Benchmark（TestAgent）** | 用 RL 对任务难度进行自适应调整              |
| **Seal-Tools**                        | 1024 嵌套工具调用，用于工具链条复杂评估     |
| **CToolEval**                         | 398 个真实 API，用于中文工具使用能力评测    |

**总结意义**：

新趋势是 **测试系统本身也由 Agent 驱动自动更新**，使得评估能够长期有效。

### **3.1.2 领域专项评估（Domain-Specific Evaluation System）**

论文指出：当前 Agent 大量落地到 **医疗、自动驾驶、数据科学、旅游规划、安全等专业领域**。

因此需要构建“专业场景 + 专业约束”的评测框架。

------

**（1）专业能力测试（Domain-Specific Competency Tests）**

| 领域     | Benchmark                  | 特点                                    |
| -------- | -------------------------- | --------------------------------------- |
| 医疗     | MedAgentBench, AI Hospital | 临床任务，符合 FHIR 标准，多 Agent 协同 |
| 自动驾驶 | LaMPilot                   | 代码生成 + 控制系统交互                 |
| 数据科学 | DSEval, DA-Code            | 数据准备到模型部署的完整流程            |
| ML 工程  | MLAgent-Bench, MLE-Bench   | Kaggle 型竞赛，Pipepline 优化           |
| 安全     | AgentHarm                  | 440 个恶意任务，工具链滥用评估          |
| 旅行规划 | TravelPlanner              | 多约束、高复杂链路规划（预算、时间）    |

意义**：

这些 benchmark 揭示：

> 在真实领域任务中，LLM Agent 的性能远低于“通用 benchmark”上表现的水平。

反映出现阶段 Agent 的 **领域适配能力弱、对真实场景 robustness 不足**。

------

**（2）真实世界环境模拟（Real-World Environment Simulation）**

目标：解决“模拟–现实差距（simulation-to-real gap）”。

| Benchmark        | 特点                                              |
| ---------------- | ------------------------------------------------- |
| **OSWorld**      | 真操作系统（Ubuntu/Win/Mac），369 实际应用任务    |
| **TurkingBench** | 类众包任务（HTML UI）                             |
| **OmniACT**      | Web+桌面自动化，32k 实例                          |
| **EgoLife**      | 300 小时自我视角视频 + 长期任务（记忆/习惯/推荐） |
| **GTA**          | 图像 + 网页 + 真实工具的综合测试                  |

**趋势：**

越来越多的评测模拟真实电脑、真实网页、真实应用程序，强调：

- 长时序任务
- 多模态输入
- 持久状态跟踪
- 多工具协作

未来 Agent 的部署场景（桌面自动化、网页自动化、助理类应用）会需要这些评测体系。

------

### **3.1.3 多智能体系统评估（Collaborative Evaluation of Complex Systems）**

趋势：评价不再是“单个 Agent”，而是 **Agent 组织结构 / 工程团队 / 多智能体协作** 能力。

------

**（1）多 Agent 系统的基准**

| Benchmark                 | 贡献                                      |
| ------------------------- | ----------------------------------------- |
| **TheAgentCompany**       | 模拟软件公司 → 测评代码协作、网页操作     |
| **AutoGen + CrewAI 比较** | 系统性实验框架，用于多 Agent 协作程序生成 |
| **MLRB**                  | 7 项科研级 ML 任务（协作式）              |
| **MLE-Bench**             | 71 个真实 Kaggle 竞赛的多 Agent 协作      |

意义**：

这些 benchmark 聚焦：

- 分工与协作
- 组织级结构（PM → RD → QA）
- 多 Agent 协作效率
- 复杂任务（如企业软件研发）

> 标志着“LLM 多 Agent = 软件团队”成为研究热点。

------

### **3.1.4 Agent评估结论（总结）**

第 3.1 节的核心观点可以浓缩为：

> **LLM Agent 的评测体系已从“模型能力测试”升级为“系统智能测试”，向真实世界任务、工具链、多 Agent 协作、跨领域专业场景扩展。**

其三大方向：

1. **通用多维评估**
    → 复杂环境 + 工具 + 多模态 + 行为轨迹分析
2. **专业场景评估**
    → 医疗、自动驾驶、数据科学、安全等行业级 benchmark
3. **多智能体协作评估**
    → 评测整个“Agent 组织系统”的协同能力

这意味着下一阶段 Agent 研究将集中于：

- 实用性
- 可部署性
- 长时序任务能力
- 组织级智能
- 工具链能力强化

## **3.2 工具**

这一节围绕 **“工具（Tools）在 LLM Agents 中的角色”** 展开，核心思想是：

> **LLM Agent 的能力并不是由模型本身决定，而是由其可访问与可构建的工具生态决定。**

本节从三个维度论述工具：

1. **LLM agents 使用的工具**（tool-use）
2. **LLM agents 自主创建的工具**（tool-creation）
3. **构建、部署和维护 LLM agents 的工具**（tooling for developers/operators）

本节体现了 **“Agent = LLM + Tooling + Environment”** 的思想框架。

------

### **3.2.1 Tools Used by LLM Agents（LLMs 使用的工具）**

本小节说明：

> **LLM 天生能力不足（无法实时访问信息、计算不精准、无法调用外部系统），工具是弥补这些缺陷的必要组件。**

工具分三类：

------

**① 知识检索工具（Knowledge Retrieval）**

目的：解决 LLM 的**知识时效性、覆盖性不足**问题。

典型系统：

- **WebGPT（OpenAI）**：LLM + 浏览器/搜索 + 引文
- **WebCPM**：中文长文 QA，扩展 WebGPT 方案到中文
- **ToolCoder**：利用搜索引擎查库函数文档

技术特点：

- 常用检索：搜索引擎、BM25、向量搜索
- 将外部知识注入 LLM 的 reasoning 流程

本类工具体现的是：

> **RAG 是 LLM agent 工具链的必需品**。

------

**② 计算工具（Computation）**

目的：解决 LLM 的**数学不精确、代码无法执行、逻辑推理不可靠**问题。

典型系统：

- **AutoCoder、RLEF**：利用代码执行反馈提升代码生成
- **CodeActAgent**：自动与解释器互动
- **Toolformer（Meta）**：训练 LLM 何时调用工具
- **ART**：将计算工具融入 reasoning

核心观点：

> **LLM 在计算任务中易产生幻觉，因此需要外部计算器或解释器。**

此类工具强化了：

- 代码执行 → 真实反馈 → 强化学习或自我改进
- 精确数学推理（LLM 的弱点）

------

**③ API 调用工具（API Interactions）**

目的：让 LLM 执行*真实世界影响*的任务（如修改数据库、调用服务）。

代表系统：

- **RestGPT、RestBench**
- **GraphQLRestBench**

能力包括：

- 构造 HTTP 请求
- 解析 API 文档
- 理解函数签名
- 构造参数和 payload
- 通过工具执行真实动作

论文指出：

> **API 工具是 LLM 从“知识系统”变成“行动系统”的关键。**

------

### 3.2.2 Tools Created by LLM Agents（LLM 自主创建工具）**

这一小节是本章节**理论高度提升的部分**。

其核心观点：

> **未来的 Agent 不只是工具的使用者，也是工具的创造者。**

意义非常重大。

LLM 不仅调用工具，还能：

- 自动生成代码工具
- 自动抽象成可复用组件
- 缓存工具以复用

典型研究：

- **CRAFRT**：将 LLM 生成的代码抽象成任务工具库
- **Toolink**：生成工具 + 调用工具形成 Chain-of-Solutions
- **CREATOR**：提出工具创建的完整生命周期（Creation–Decision–Execution–Reflection）
- **LATM**：让 LLM 以 “工具作者” 和 “工具使用者” 分阶段运行，并加上 tool caching

隐含意义：

> **Agent 具备自我扩展能力（self-extendability）**
>  工具形成“自举循环”：
>  LLM → 生成工具 → 工具增强能力 → 生成更强的工具……

这是迈向 AGI 的重要路径之一。

------

### 3.2.3 Tools for Deploying LLM Agents（开发/部署工具）**

这一节从**工程体系角度**总结 Agent 生态的外部工具。

分成三类：

------

**① 生产化（Productionization）**

主要框架（包括代码和低代码平台）：

- **AutoGen**
- **LangChain**
- **LlamaIndex**
- **Dify**

提供能力：

- 多 Agent 协作框架
- 工作流引擎
- RAG 管道
- 数据索引与检索
- 图形化开发环境（Dify Canvas）

本类关注：

> **如何让 Agent 在企业/产品环境可落地。**

------

**② 运维（Operation & Maintenance）**

强调 observability（可观测性）：

- **Ollama**：本地部署、可监控
- **Dify**：日志、反馈、用户数据分析、持续改进
- **langsmith**：当前市场上 **最成熟** 的 LLM 应用可观测平台，与langchain深度集成，但不限于langchain生态的项目

O&M 是 LLM 应用中经常被忽略但实际最关键的部分。

------

**③ Model Context Protocol (MCP)**

作用：

- 建立 LLM 与应用之间的标准化安全通讯协议
- 实现 context injection
- 形成 Agent 的统一互动层

代表工具：

- **MCP-Agent** 框架

MCP 使：

> **工具集成从“手写 glue code”变成标准协议**，是未来 Agent 生态统一化的关键基础设施。



# 4、Agent面临的现实问题

本节概述了Agent当前面临的现实问题，安全、隐私、社会影响，分为：

1. Agent-centric Security
2. Data-centric Security
3. Privacy
4. Social Impact and Ethical Concern

![image-20251118135443251](/images/posts/llm-agent-survey-methods-apps-challenges/challenges.png)



------

## 4.1 Agent-centric Security（以模型为中心的安全风险）

这类风险直接针对模型本身，包括权重、架构、推理过程等，最终可能导致性能退化、错误输出或隐私泄露。

### 4.1.1 Adversarial Attacks（对抗攻击）

攻击通过构造恶意输入干扰 agent 的知觉、规划或行动模块。

- **典型风险**：操控工具调用、任务失败、推理路径污染
- **代表攻击**：CheatAgent、GIGA（感染式梯度攻击）
- **防御方法**：LLAMOS 输入净化、多智能体辩论

### 4.1.2 Jailbreaking Attacks（越狱攻击）

旨在绕过安全策略，使模型产生受限或有害信息。

- **代表攻击**：RLTA（RL生成越狱提示）、RLbreaker（黑盒越狱）
- **防御方法**：AutoDefense 多智能体协同过滤、ShieldLearner 自主学习防御模式

### 4.1.3 Backdoor Attacks（后门攻击）

在模型内部植入触发器，在特定输入出现时导致预设的恶意行为。

- **代表攻击**：DemonAgent 动态加密后门、DarkMind 推理链污染
- **防御方法**：审计、触发器检测、强化推理一致性

### 4.1.4 Model Collaboration Attacks（多模型协同攻击）

利用多模型交互机制的脆弱性进行攻击。

- **代表攻击**：CORBA（多智能体通信递归污染）、AiTM（拦截并篡改 inter-agent message）
- **防御方法**：G-Safeguard 图结构异常检测、TrustAgent 风险意识规划

------

## 4.2 Data-centric Security（以数据为中心的安全风险）

攻击者不修改模型本身，而是污染输入数据或交互过程。

### 4.2.1 External Data Attack（外部数据攻击）

包括：

- **用户输入注入**（最常见也最有效）
- **黑暗心理诱导**（通过情绪词让 agent 变得攻击性或反社会）
- **RAG 知识库投毒**（最危险，RAG 比传统 LLM 更易被引导）
- **Indirect Prompt Injection（IPI）**（通过网页、文档、邮件嵌入恶意提示）

**防御手段**：input firewall、流程一致性验证、multi-agent debate

### 4.2.2 Interaction Attack（交互攻击）

发生在：

① 用户–agent 交互

攻击者从本地记忆中提取历史隐私，如 Private Memory Extraction。

② agent–agent 交互

污染一个 agent → 网络感染式扩散，如 AgentSmith。

③ agent–tool 交互

通过篡改 planning chain → 让 agent 调用危险工具。

防御方式包括：blockchain-based consensus、trajectory firewall、planning verification

------

## 4.3 Privacy（隐私风险）

LLM 的“记忆能力”导致训练数据与提示文本泄露风险。

### 4.3.1 Memorization Vulnerabilities（训练数据记忆导致隐私泄露）

- **Data Extraction**：直接从模型生成中恢复个人隐私（PID、邮箱等）
- **Membership Inference**：判断某条数据是否出现在训练集中
- **Attribute Inference**：推断敏感属性（性别、疾病等）

**主要防御**：Differential Privacy、数据清洗、Knowledge Distillation、隐私泄露预警工具（如 ProPILE）

### 4.3.2 Intellectual Property Threats（知识产权风险）

- **Model Stealing**：推测参数、优化器、解码算法
- **Prompt Stealing**：反推出系统提示（system prompt）

**防御方式**：水印、对抗扰动、区块链溯源

------

## 4.4 Social Impact & Ethical Concerns（社会影响与伦理问题）

### 4.4.1 正面影响（Benefits）

- 自动化提升医疗、法律、教育效率
- 推动就业结构转型
- 提升知识获取与信息分发能力
- 支撑智慧教育、智能客服等领域的可及性提升

### 4.4.2 社会与伦理风险（Risks）

① 偏见与歧视

LLM agents 会强化训练数据中的偏见。

② 责任难界定（Accountability）

模型输出不可追责、训练数据不可审计。

③ 版权问题（Copyright）

涉及：

- 非授权数据训练
- 生成内容与原作品过于相似
- “AI-generated data → 再喂给 AI”导致质量退化

④ Misinformation 与操控风险

虚假信息传播、政治操控、自动化诈骗。

⑤ 缺乏真实理解（Symbolic limitation）

LLM 不具备真正语义理解，但用户常误认为其具有“真实智能”。

# 5、应用

这章的内容概述了 **LLM-based Multi-Agent Systems** 在多个关键领域（科学研究、化学/材料/天文、生物、医学、游戏、社会科学、生产力工具）的最新进展。以下内容并不按照原论文的结构。

## 5.1 LLM based Agent 应用整体趋势

1. 从单模型智能 → 群体智能（Collective Intelligence）
2. Agent 系统正从“对话工具”向“科学发现工具”转型（如在我所在的制造业中，使用Agent实现自动工艺优化是一个热门方向）
3. 工具调用 + LLM 决策 成为核心范式
4. 科学研究中关注“可靠性提升（Rigorous Science）”
5. 数据集构建成为重要应用场景（在模型微调中，具有代表性的alapca数据集就是通过gpt3.5得到的，开启了LLM 微调的时代）

## 5.2 LLM 多智能体在各领域的应用精炼总结

1. **科学研究**
   - 多智能体通过分工协作（如假说生成、实验设计、批判性评估）提升科学研究的系统性与可靠性。
2. **化学、材料与天文学**
   - **化学**：自动规划分子设计和合成流程。
   - **材料**：多代理协作完成材料参数探索与结构设计。
   - **天文学**：辅助望远镜配置与天文数据分析脚本生成。
3. **生命科学**
   - 支持基因功能推断、基因扰动实验生成、生物知识检索与验证，形成闭环科学推理能力。
4. **科学数据构建**
   - 利用多智能体自动生成、校验并维护高质量图像、文本和问答类科学数据集。
5. **医学与临床**
   - 多代理模拟临床场景，整合影像、病历和医学知识库，实现辅助诊断和医疗流程模拟。
6. **游戏**
   - 构建具有长期规划、学习和合作能力的游戏智能体，并生成游戏任务、剧情和互动内容。
7. **社会科学**
   - 支持经济决策模拟、人格与群体行为实验，以及社会系统中信息与行为传播的仿真。
8. **生产力工具**
   - 在软件开发、推荐系统等领域，通过智能体角色分工提升任务执行自动化、协作性与效率。



# 6、面临的挑战和未来趋势

未来的趋势亦是挑战

## **6.1 六大挑战极简总结**

1. **可扩展性与协作**：LLM 多智能体因计算和协调负担巨大，亟需分层结构和高效通信来支持规模化运行。
2. **记忆与长期适应**：有限上下文难以支撑长期连续任务，需要更强的分层记忆与动态知识压缩机制。
3. **可靠性与严谨性**：幻觉与不确定性会在多代理中叠加扩散，需要严格验证、交叉校对与人类监督。
4. **动态评估不足**：传统静态评测无法反映多轮、多代理的涌现行为，需构建动态交互式评估体系。
5. **安全与监管**：偏见、透明度和责任追踪仍是关键问题，需要统一审计机制与法律伦理协同。
6. **角色扮演局限**：因数据与认知限制，LLM 模拟角色仍不充分，需提升角色多样性与真实世界推理能力。

