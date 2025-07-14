# Open Gemini CLI 实现思路

本文档基于对现有架构的分析，细化了集成OpenAI API的实现步骤。

## 1. 认证 (Auth)

目标：在CLI中无缝集成OpenAI的认证方式。

1. **扩展认证类型枚举 `AuthType`**:
    - **文件**: `packages/core/src/core/contentGenerator.ts`
    - **操作**: 在 `AuthType` 枚举中增加 `OPENAI_COMPATIBLE = 'openai-compatible'` 选项，用于标识使用OpenAI Compatible的认证方式。

2. **更新认证对话框UI**:
    - **文件**: `packages/cli/src/ui/components/AuthDialog.tsx`
    - **操作**: 在 `items` 数组中，新增一个代表“使用OpenAI Compatible”的选项，其 `value` 对应新增的 `AuthType.OPENAI_COMPATIBLE`。

3. **实现认证方法验证**:
    - **文件**: `packages/cli/src/config/auth.ts`
    - **操作**: 修改 `validateAuthMethod` 函数，增加一个case来处理 `AuthType.OPENAI_COMPATIBLE`。该逻辑应检查 `process.env.OPENAI_API_KEY` 环境变量是否存在且有效。如果不存在，应返回明确的错误提示信息。未来需要支持更精细的认证方式，如为LLM VLM EMBEDDNIG FLASH模型单独配置凭证。

4. **更新设置加载逻辑**:
    - **文件**: `packages/cli/src/config/settings.ts`
    - **操作**: 确保 `loadSettings` 和相关逻辑能正确处理 `selectedAuthType` 为 `OPENAI_COMPATIBLE` 的情况。当前设计依赖环境变量，可能无需修改 `Settings` 接口，但需确保流程通畅。

## 2. 内容生成器 (ContentGenerator)

目标：抽象并重构 `ContentGenerator`，使其支持Gemini和OpenAI两种后端。

1. **创建 `openaiContentGenerator.ts`**:
    - **路径**: `packages/core/src/core/openaiContentGenerator.ts`
    - **操作**: 新建此文件，用于实现与OpenAI API的交互逻辑。

2. **定义 `OpenAIContentGenerator` 类**:
    - **操作**: 在上述文件中创建 `OpenAIContentGenerator` 类，并实现 `ContentGenerator` 接口。此类将使用官方的 `openai` NPM包。
    - **核心方法**: 实现接口要求的所有方法，包括 `generateContent`, `generateContentStream`, `countTokens` 和 `embedContent`。
    - **构造函数**: 接收OpenAI Compatible作为初始化参数。

3. **改造 `createContentGenerator` 工厂函数**:
    - **文件**: `packages/core/src/core/contentGenerator.ts`
    - **操作**: 修改此工厂函数。当 `config.authType` 为 `AuthType.OPENAI_COMPATIBLE` 时，它应该实例化并返回 `OpenAIContentGenerator` 的一个实例。
    - **建议**: 为了代码清晰，可以将现有的Gemini相关生成逻辑（当前在 `createContentGenerator` 中的 `GoogleGenAI` 部分）封装到一个独立的 `GeminiContentGenerator` 类中，使结构更对称。

## 3. 适配层 (Adapter)

目标：创建一个适配层，弥合Gemini和OpenAI API在数据结构和行为上的差异，确保`core`包的核心逻辑（如`Turn`, `GeminiChat`）可以透明地与`OpenAIContentGenerator`协作。

1. **消息格式转换 (`MessageConverter`)**:
    - **路径**: `packages/core/src/adapter/messageConverter.ts`
    - **`geminiToOpenAIMessages`**: 实现一个函数，将Gemini的 `Content[]` 历史记录格式转换为OpenAI的 `ChatCompletionMessageParam[]` 格式（包含 `system`, `user`, `assistant`, `tool` 等角色）。
    - **`openAIResponseToGeminiResponse`**: 实现一个函数，将OpenAI的响应（`ChatCompletion` 或流式块 `ChatCompletionChunk`）转换回`@google/genai`库所定义的 `GenerateContentResponse` 结构。这是确保 `Turn` 类能正确处理响应的关键。

2. **工具调用适配 (`ToolCallAdapter`)**:
    - **格式映射**: Gemini的 `FunctionDeclaration` 需要被映射为OpenAI的 `tools` 参数格式。
    - **响应转换**: OpenAI响应中的 `tool_calls` 数组需要被转换回Gemini所期望的 `functionCalls` 数组格式，以便 `CoreToolScheduler` 能够正确调度。

3. **流式响应适配 (`StreamAdapter`)**:
    - **位置**: 此逻辑主要在 `OpenAIContentGenerator.generateContentStream` 方法内部实现。
    - **操作**: 循环处理OpenAI返回的 `ChatCompletionChunk`。每个 `chunk` 的 `choices[0].delta` 中可能包含 `content`（文本增量）或 `tool_calls`。需要将这些增量数据逐步累积，并适时 `yield` 出一个兼容 `GenerateContentResponse` 格式的中间对象，供 `Turn` 类消费。

4. **事件流转换**:
    - **目标**: 确保无论后端是Gemini还是OpenAI，`Turn.run()` 方法最终都能产生统一的 `ServerGeminiStreamEvent` 事件流。
    - **实现**: 核心工作由 `openAIResponseToGeminiResponse` 适配器完成。它提供的转换后数据，将使 `Turn` 类能够像处理Gemini原生响应一样，正确地解析出文本内容、工具调用请求、思考过程等，并生成对应的 `Content`, `ToolCallRequest` 等事件。

## 4. 文件解析 (File Parser) - 待办

- **初步设想**: 添加 `FileParser` 与 `ModalInterpreter`。
- **`FileParser`**: 负责将文件分解为基础模态组成，如文本、图片、音频。
- **`ModalInterpreter`**: 调用对应模态的解释器进行解析，最终合成统一的文本模态描述，供模型理解。

此部分修改暂不实现
