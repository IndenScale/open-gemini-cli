## Gemini Added Memories

* open-gemini-cli 是一个 Google Gemini CLI 的分叉版本，核心特性是支持连接任何 OpenAI 兼容 API 作为 Agent 推理引擎。它通过引入 API Adaptor 适配器层实现透明后端切换，将 Gemini 内部格式转换为 OpenAI 兼容格式，并支持流式输出、被动工具调用、主动工具调用和多轮主动工具调用等高级功能。配置支持全局配置（OPENAI\_LLM\_KEY、OPENAI\_LLM\_BASE、OPENAI\_LLM\_MODEL）和精细化配置（为不同任务类型配置不同模型）。架构上采用模块化设计，包含 ContentGenerator 抽象层、GeminiToOpenAIConverter 和 OpenAIToGeminiConverter 两个转换器类来处理请求和响应的格式转换。
