# Open Gemini CLI 实现说明

本文档旨在详细说明 `open-gemini-cli` 为集成 OpenAI 兼容 API 所做的核心架构改造。此前的计划文档已成功实现，本文将描述最终的实现方案。

## 1. 认证 (Auth)

为了无缝集成 OpenAI 的认证方式，我们进行了如下改造：

1.  **扩展认证类型 `AuthType`**:
    *   **文件**: `packages/core/src/core/contentGenerator.ts`
    *   **实现**: 在 `AuthType` 枚举中增加了 `OPENAI_COMPATIBLE = 'openai-compatible'` 成员，用于标识使用 OpenAI 兼容 API 的认证方式。

2.  **更新认证对话框与配置加载**:
    *   **文件**: `packages/cli/src/ui/components/AuthDialog.tsx` 和 `packages/cli/src/config/auth.ts`
    *   **实现**: 前端交互流程已更新，允许用户选择“使用 OpenAI 兼容 API”。核心配置加载逻辑位于 `packages/core/src/core/contentGenerator.ts` 的 `createContentGeneratorConfig` 函数中。该函数现在会检查 `authType` 是否为 `OPENAI_COMPATIBLE`，并从环境变量中读取 `OPENAI_API_KEY`, `OPENAI_BASE_URL`, 和 `OPENAI_MODEL`，从而完成配置。这套机制同时支持 `README_ZH.md` 中提到的全局配置和精细化配置。

## 2. 内容生成器 (ContentGenerator)

为了支持 Gemini 和 OpenAI 两种后端，`ContentGenerator` 已被成功抽象和重构。

1.  **创建 `OpenAIContentGenerator`**:
    *   **文件**: `packages/core/src/core/openaiContentGenerator.ts`
    *   **实现**: 我们创建了全新的 `OpenAIContentGenerator` 类，它实现了 `ContentGenerator` 接口。此类内部使用官方的 `openai` NPM 包，负责处理所有与 OpenAI 兼容 API 的交互，包括 `generateContent`, `generateContentStream` 等核心方法。

2.  **封装 `GeminiContentGenerator`**:
    *   **文件**: `packages/core/src/core/geminiContentGenerator.ts`
    *   **实现**: 原有的 Gemini API 调用逻辑被封装到了独立的 `GeminiContentGenerator` 类中，同样实现了 `ContentGenerator` 接口。

3.  **改造 `createContentGenerator` 工厂函数**:
    *   **文件**: `packages/core/src/core/contentGenerator.ts`
    *   **实现**: 此工厂函数现在是动态选择后端的入口。它会根据传入的 `config.authType`，判断是应该实例化 `GeminiContentGenerator` 还是 `OpenAIContentGenerator`，从而实现了对上层核心逻辑透明的后端切换。

## 3. 适配层 (Adapter)

适配层是本次改造的核心，它弥合了 Gemini 和 OpenAI API 在数据结构和行为上的差异，确保了 `core` 包的核心逻辑（如 `Turn`, `GeminiChat`）无需任何修改，即可透明地与 `OpenAIContentGenerator` 协作。

**文件**: `packages/core/src/utils/adapter.ts`

适配层主要由两个转换器类构成：

### `GeminiToOpenAIConverter` (请求转换：Gemini -> OpenAI)

这个类负责将 `gemini-cli` 内部的数据结构转换为 OpenAI API 可以理解的格式。

-   **`convertContentsToMessages`**: 将 Gemini 的 `Content[]` 历史记录（包含 `user`, `model` 角色和复杂的 `parts` 数组）转换为 OpenAI 的 `ChatCompletionMessageParam[]` 格式（包含 `system`, `user`, `assistant`, `tool` 等角色）。它能正确处理文本、函数响应 (`functionResponse`) 和函数调用 (`functionCall`)。
-   **`convertToolsToOpenAI`**: 将 Gemini 的 `Tool[]` (包含 `FunctionDeclaration` 列表) 映射为 OpenAI 的 `ChatCompletionTool[]` 格式，包括参数的 JSON Schema 转换。
-   **`convertConfigToOpenAIParams`**: 转换 `temperature`, `maxOutputTokens` 等生成参数。

### `OpenAIToGeminiConverter` (响应转换：OpenAI -> Gemini)

这个类负责将 OpenAI API 的返回数据“翻译”回 `gemini-cli` 核心逻辑所期望的 `@google/genai` 格式。这是保证流式输出、工具调用等复杂功能正常工作的关键。

-   **`convertResponseToGemini`**: 将一个完整的 OpenAI `ChatCompletion` 响应对象，转换回 `GenerateContentResponse` 结构。它能将 OpenAI 的 `tool_calls` 数组正确地转换回 Gemini 的 `functionCall` 格式的 `Part`。
-   **`convertStreamingChunkToGemini`**: 这是适配层中最精妙的部分。它处理 OpenAI 的流式响应块 (`ChatCompletionChunk`)。
    -   **增量处理**: 它能正确处理 `delta.content` (文本增量) 和 `delta.tool_calls` (工具调用增量，其 `name` 和 `arguments` 可能会被拆分在多个 chunk 中)。
    -   **状态管理**: 内部维护一个 `accumulatedToolCalls` 状态，用于将碎片化的 `tool_call` 数据块逐步拼装成一个完整的、可解析的 JSON 对象。
    -   **实时 `yield`**: 一旦拼装完成或收到文本，它会立即 `yield` 一个与 Gemini 原生流格式完全兼容的 `GenerateContentResponse` 对象。
    -   **统一事件流**: 通过这种方式，无论后端是 Gemini 还是 OpenAI，`Turn.run()` 方法接收到的都是统一的事件流，使其能够一致地处理文本内容 (`Content`) 和工具调用请求 (`ToolCallRequest`)，而无需关心底层的 API 来源。

## 4. 文件解析 (File Parser) - 待办

-   **初步设想**: 添加 `FileParser` 与 `ModalInterpreter`。
-   **`FileParser`**: 负责将文件分解为基础模态组成，如文本、图片、音频。
-   **`ModalInterpreter`**: 调用对应模态的解释器进行解析，最终合成统一的文本模态描述，供模型理解。

此部分修改暂未实现。