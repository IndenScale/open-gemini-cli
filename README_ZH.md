# open-gemini-cli

Open Gemini CLI，一个 Google Gemini CLI 的分叉版本，旨在赋予您连接和使用任何 OpenAI 兼容 API 作为 Agent 推理引擎的自由。
我们相信，一个强大的 Agent 工具不应被锁定在单一的生态系统中。通过开放后端选择，我们希望能激发更多的创新、保护用户隐私，并推动一个更加开放和协作的 AI Agent 生态。

## 💡 为什么选择 Open Gemini CLI？

使用 Open Gemini CLI，您可以：

- 自由选择 MaaS 供应商: 不再局限于单一云厂商，您可以在任何提供 OpenAI 兼容 API 的平台（如 Azure, Groq, Together AI, 以及众多开源模型框架）上运行您的 Agent。
- 使用本地托管模型以保护隐私: 通过连接到本地运行的 LLM（如通过 Ollama, vLLM, LlamaEdge 等），您可以确保代码和数据完全停留在您的设备上，实现最高级别的隐私和安全。
- 混合使用多种模型以平衡成本与效率: 您可以为不同的任务（如通用推理、代码生成、视觉理解）配置不同的模型供应商，实现成本和性能的最佳组合。
- 在 Agentic 任务中评估和比较模型: 在相同的复杂工作流中，轻松切换和比较不同模型（如 GPT-4o, Llama3, Mixtral, Qwen2）的表现，找到最适合您任务的“大脑”。

## 🚀 快速启动

1. 安装先决条件: 确保您已安装 Node.js version 20 或更高版本。
2. 通过 npx 直接运行（推荐）： `npx https://github.com/IndenScale/open-gemini-cli`
3. 或者，全局安装：`npm install -g @indenscale/open-gemini-cli`
4. 配置首次运行时，CLI 会引导您进行交互式配置。当询问认证方式时，选择新增的 Use an OpenAI Compatible API 选项。您也可以通过环境变量进行快速配置：全局配置 (推荐)这是最简单的方式，将所有请求都指向同一个 OpenAI 兼容的端点。# 您的 API 密钥 (必需)

```bash
export OPENAI_LLM_KEY="your-moonshot-api-key"
export OPENAI_LLM_BASE="https://api.moonshot.cn/v1"
export OPENAI_LLM_MODEL="kimi-k2-0711-preview"
```

## 精细化配置 (高级)尚未实现

您可以为不同类型的任务指定不同的模型供应商，以实现成本和性能的极致优化。# 主要的 LLM 推理使用一个强大的模型

```bash
export OPENAI_LLM_KEY="your-moonshot-api-key"
export OPENAI_LLM_BASE="https://api.moonshot.cn/v1"
export OPENAI_LLM_MODEL="kimi-k2-0711-preview"

# 视觉理解 (VLM) 使用另一个模型
export OPENAI_VLM_KEY="sk-..."
export OPENAI_VLM_BASE="https://api.openai.com/v1"
export OPENAI_VLM_MODEL="gpt-4o"

# 快速、廉价的任务 (如对话历史压缩) 使用 Flash 模型
export OPENAI_FLASH_KEY="sk-..."
export OPENAI_FLASH_BASE="https://api.together.xyz/v1"
export OPENAI_FLASH_MODEL="mistralai/Mixtral-8x7B-Instruct-v0.1"
```

## 🛠️ 实现思路

为了保证透明性，我们在此简要说明 open-gemini-cli 的兼容层实现思路：我们引入了一个适配器层 (API Adaptor)，它作为核心 Agent 逻辑与底层模型 API 之间的“翻译官”。

- 请求转换: 当您发出指令时，APIAdaptor 会将 Gemini 内部的消息和工具调用格式（Content[]）转换为 OpenAI 兼容的 messages 数组格式。
- 响应转换: 当 OpenAI 兼容 API 以流式（delta）返回数据时，APIAdaptor 会将这些增量数据块重新组合成 gemini-cli 上层逻辑所期望的、结构完整的 GenerateContentResponse 事件。

这个设计确保了 gemini-cli 强大的 Agent 调度、工具执行和多轮交互逻辑可以保持不变，同时无缝地运行在不同的推理后端之上。

## 🔮 未来计划

我们正在积极增强文件处理工具（read_file, read_many_files）。由于许多 OpenAI 兼容模型不像 Gemini 那样具备原生的、一体化的多模态能力，我们将引入一个文件解析与理解层。这将允许 CLI 自动将图像、PDF 等文件内容转换为高质量的文本描述，再提交给核心 LLM，从而在任何模型上实现强大的多模态文件交互能力。

## ❤️ 欢迎贡献

open-gemini-cli 是一个由社区驱动的项目。我们欢迎任何形式的贡献，无论是提交 Bug 报告、提出功能建议，还是直接贡献代码。如果您认同这个项目的愿景，请加入我们，共同打造一个更加开放、自由和强大的 AI Agent 工具！
