# **第一阶段改造方案：实现流式对话 (Streaming Chat)**

本阶段的核心目标是打通 `open-gemini-cli` 与任何 OpenAI 兼容 API 的基础连接，并成功实现流式对话功能。这是后续所有高级功能（如工具调用）的基石。

我们将遵循在 `dev_notes/02_Implementation/README.md` 中规划的总体思路，并将其细化为本阶段的具体执行步骤。

## **第一步：认证集成 (Auth Integration)**

目标：让 CLI 能够识别并处理新的 "OpenAI 兼容 API" 认证方式。

1.  **扩展认证类型 `AuthType`**:
    -   **文件**: `packages/core/src/core/contentGenerator.ts`
    -   **操作**: 在 `AuthType` 枚举中增加 `OPENAI_COMPATIBLE = 'openai-compatible'`。

2.  **更新认证对话框 `AuthDialog`**:
    -   **文件**: `packages/cli/src/ui/components/AuthDialog.tsx`
    -   **操作**: 在 UI 选项中加入 "Use an OpenAI Compatible API"，使其与新的 `AuthType` 关联。

3.  **实现认证逻辑 `validateAuthMethod`**:
    -   **文件**: `packages/cli/src/config/auth.ts`
    -   **操作**: 添加对 `AuthType.OPENAI_COMPATIBLE` 的处理逻辑，核心是检查必要的环境变量（如 `OPENAI_API_KEY`, `OPENAI_BASE_URL`）是否已设置。

## **第二步：内容生成器抽象 (Content Generator Abstraction)**

目标：创建一个能够与 OpenAI API 通信的新内容生成器，并将其集成到现有工厂函数中。

1.  **创建 `OpenAIContentGenerator`**:
    -   **路径**: `packages/core/src/core/openaiContentGenerator.ts`
    -   **操作**: 新建此文件，并定义 `OpenAIContentGenerator` 类，该类需要实现 `ContentGenerator` 接口。它将使用 `openai` 库来处理 API 请求。

2.  **实现核心方法**:
    -   **`generateContentStream`**: 这是本阶段的重点。此方法需要调用 OpenAI API 的流式接口，并返回一个异步生成器。
    -   **`generateContent`**: 实现非流式版本作为备用。
    -   **`countTokens` / `embedContent`**: 暂时可以留空或返回默认值，在后续阶段完善。

3.  **改造工厂函数 `createContentGenerator`**:
    -   **文件**: `packages/core/src/core/contentGenerator.ts`
    -   **操作**: 修改此函数，使其能够根据 `config.authType` 的值，决定是实例化并返回 `GeminiContentGenerator`（现有逻辑）还是新的 `OpenAIContentGenerator`。

## **第三步：适配层实现 (Adapter Implementation)**

目标：创建转换层，处理 Gemini 与 OpenAI 之间数据结构的差异，确保上层逻辑无需改动即可兼容两种后端。

1.  **消息格式转换 (`MessageConverter`)**:
    -   **路径**: `packages/core/src/adapter/messageConverter.ts`
    -   **`geminiToOpenAIMessages`**: 实现一个函数，将 Gemini 的 `Content[]` 格式转换为 OpenAI 的 `ChatCompletionMessageParam[]` 格式。这是发送请求前的必要步骤。

2.  **流式响应适配 (`StreamAdapter`)**:
    -   **位置**: 此逻辑将在 `OpenAIContentGenerator.generateContentStream` 方法内部实现。
    -   **操作**: 这是实现流式对话的关键。
        -   循环处理从 OpenAI API 返回的流式数据块 (`ChatCompletionChunk`)。
        -   将每个数据块的 `delta.content`（文本增量）提取出来。
        -   将这些增量文本包装成 `GenerateContentResponse` 格式，并通过 `yield` 返回。
        -   这个适配过程确保了 `Turn` 类可以像处理 Gemini 原生流一样处理来自 OpenAI 的数据流，从而无缝地将内容实时渲染到用户界面。

完成以上三个步骤后，`open-gemini-cli` 将具备通过 OpenAI 兼容 API 进行基本流式聊天的能力。这将为第二阶段“被动工具调用”的实现奠定坚实的基础。
