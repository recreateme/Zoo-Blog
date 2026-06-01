---
title: 大型语言模型（LLM）入门指南
slug: introduction-to-llm
category: ai
subcategory: 基础理论
tags: ["llm", "transformer", "deep-learning", "nlp"]
status: published
publishedAt: 2024-01-15
summary: 本文从原理出发，系统介绍大型语言模型（LLM）的核心概念、架构演进与实际应用，适合有一定深度学习基础的读者入门。
---

# 大型语言模型（LLM）入门指南

大型语言模型（Large Language Model，LLM）是近年来 AI 领域最重要的突破之一。从 GPT 系列到 Claude，这些模型正在深刻改变人机交互的方式。

## 什么是语言模型

语言模型的核心任务是**预测下一个词**。给定一个词序列 $w_1, w_2, \ldots, w_{t-1}$，模型学习：

$$P(w_t \mid w_1, w_2, \ldots, w_{t-1})$$

早期的语言模型（如 n-gram）通过统计方法建模，现代 LLM 则基于 Transformer 架构，通过海量数据学习语言的深层规律。

## Transformer 架构核心

Transformer 由 Vaswani 等人在 2017 年的论文《Attention Is All You Need》中提出，其核心是**自注意力机制（Self-Attention）**：

```python
import torch
import torch.nn.functional as F

def scaled_dot_product_attention(Q, K, V, mask=None):
    """
    Q: Query  (batch, heads, seq_len, d_k)
    K: Key    (batch, heads, seq_len, d_k)
    V: Value  (batch, heads, seq_len, d_v)
    """
    d_k = Q.size(-1)
    
    # 计算注意力分数
    scores = torch.matmul(Q, K.transpose(-2, -1)) / (d_k ** 0.5)
    
    if mask is not None:
        scores = scores.masked_fill(mask == 0, -1e9)
    
    attn_weights = F.softmax(scores, dim=-1)
    return torch.matmul(attn_weights, V), attn_weights
```

### 多头注意力

多头注意力允许模型在不同表示子空间中并行关注信息：

$$\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, \ldots, \text{head}_h) W^O$$

其中每个注意力头：

$$\text{head}_i = \text{Attention}(Q W_i^Q, K W_i^K, V W_i^V)$$

## 主流 LLM 对比

| 模型 | 发布方 | 参数量 | 上下文长度 | 特点 |
|------|--------|--------|-----------|------|
| GPT-4 | OpenAI | 未公开 | 128K | 多模态，推理能力强 |
| Claude 3 | Anthropic | 未公开 | 200K | 长上下文，安全性好 |
| Llama 3 | Meta | 8B/70B | 8K | 开源，可本地部署 |
| Qwen2 | 阿里 | 7B/72B | 128K | 中文能力强 |

## 预训练与微调

LLM 的训练分为两个阶段：

### 1. 预训练（Pre-training）

在海量文本上进行自监督学习，目标是最大化语言建模的对数似然：

$$\mathcal{L} = -\sum_{t} \log P(w_t \mid w_1, \ldots, w_{t-1}; \theta)$$

### 2. 指令微调（Instruction Fine-tuning）

通过人类标注的高质量指令数据，让模型学会"按照指令回答问题"，常见方法包括：

- **SFT**（Supervised Fine-Tuning）：监督微调
- **RLHF**（Reinforcement Learning from Human Feedback）：人类反馈强化学习
- **DPO**（Direct Preference Optimization）：直接偏好优化

## 使用 API 调用 LLM

```python
from anthropic import Anthropic

client = Anthropic()

message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": "请解释一下 Transformer 中的位置编码"
        }
    ]
)

print(message.content[0].text)
```

## 常见问题与局限性

> **幻觉问题（Hallucination）**：LLM 有时会生成听起来合理但实际错误的信息，这是当前最大的挑战之一。

主要局限性包括：

- 知识截止日期（Training Cutoff）
- 推理能力仍有不足
- 计算成本高昂
- 上下文窗口限制

## 延伸阅读

- Vaswani et al., [Attention Is All You Need](https://arxiv.org/abs/1706.03762) (2017)
- Brown et al., [Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165) (GPT-3)
- Anthropic, [Claude's Model Specification](https://www.anthropic.com/news/claude-s-constitution)

---

*这是一篇入门指南，后续将深入介绍 RAG、Agent、微调等进阶主题。*
