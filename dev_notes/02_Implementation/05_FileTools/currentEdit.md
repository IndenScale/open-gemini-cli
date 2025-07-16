# 功能实现：本地文件解析服务 (`FileParserService`)

## 1. 概述

为了从根本上解决各大模型服务商（MaaS）对文件处理 API 的碎片化支持问题，我们决定采取“本地文件解析”的策略。该策略的核心是在 `open-gemini-cli` 客户端直接实现文件到文本的转换，然后将纯文本内容注入到发送给模型的提示中。这使得我们能够绕过所有厂商的专有文件 API，实现对任意支持长文本上下文模型的文件处理能力。

本次修改实现了该策略的端到端落地。

## 2. 核心服务层 (`packages/core`)

### 2.1. 新增 `FileParserService`

-   **文件位置**: `packages/core/src/services/fileParserService.ts`
-   **核心能力**:
    -   提供一个公共方法 `parseFileToMarkdown(filePath)`，作为所有文件解析任务的统一入口。
    -   内部根据文件扩展名（`.docx`, `.pdf`, `.xlsx` 等）路由到不同的私有解析方法。
    -   **Word (.docx)**: 使用 `mammoth` 库将其内容转换为 Markdown。
    -   **PDF (.pdf)**: 使用 `pdf-parse` 库提取其纯文本内容。
    -   **Excel (.xls, .xlsx)**: 使用 `xlsx` 库读取第一个工作表，并将其转换为 Markdown 表格。
    -   **图像/SVG**: 为图像类文件预留了 `parseImageWithVLM` 的占位符方法，为未来集成视觉语言模型（VLM）做好了准备。
-   **依赖安装**: 为 `packages/core` 添加了 `mammoth`, `pdf-parse`, `xlsx` 及其必要的类型定义。
-   **服务导出**: 在 `packages/core/index.ts` 中导出了 `FileParserService`，使其可以被其他包（如 `cli`）引用。

### 2.2. 改造核心客户端 `GeminiClient`

-   **文件位置**: `packages/core/src/core/client.ts`
-   **集成方式**:
    1.  在 `GeminiClient` 的构造函数中，导入并实例化了 `FileParserService`。
    2.  新增了一个私有异步方法 `parseFilesFromContent(contents: Content[]): Promise<Content[]>`。
    3.  **约定了一种新的内部数据结构**：使用一个特殊的 `Part` 对象 ` { functionCall: { name: 'file_parser', args: { path: '...' } } }` 来表示一个待解析的文件。
    4.  `parseFilesFromContent` 方法负责遍历所有收到的 `Content`，查找这种特殊的 `functionCall`，调用 `FileParserService` 执行解析，然后用解析后的 Markdown 文本替换掉原来的 `functionCall` Part。
    5.  在 `generateContent` 和 `sendMessageStream` 两个核心的 API 调用方法中，**在将请求发送给模型之前**，先调用 `parseFilesFromContent` 对用户输入进行预处理。

## 3. 命令行接口层 (`packages/cli`)

### 3.1. 新增 `--file` 命令行参数

-   **文件位置**: `packages/cli/src/config/config.ts`
-   **实现**:
    -   在 `parseArguments` 函数中，使用 `yargs` 添加了一个新的命令行选项：
        ```javascript
        .option('file', {
          type: 'string',
          array: true, // 允许用户多次使用该参数以提供多个文件
          description: 'Path to a file to include in the prompt context. Can be used multiple times.',
        })
        ```

### 3.2. 连接 CLI 参数与核心服务

-   **文件位置**: `packages/cli/src/nonInteractiveCli.ts` 和 `packages/cli/src/gemini.tsx`
-   **实现**:
    1.  修改了 `gemini.tsx`，将解析后的命令行参数对象 `argv` 传递给 `runNonInteractive` 函数。
    2.  修改了 `runNonInteractive` 函数的签名以接收 `argv`。
    3.  在 `runNonInteractive` 的起始位置，检查 `argv.file` 是否存在。
    4.  如果存在，则遍历文件路径数组，并将每个路径包装成我们约定的 `functionCall` Part 结构。
    5.  将这些文件 `Part` 与用户的文本提示 `Part` 组合成一个 `initialParts` 数组。
    6.  将这个最终的 `initialParts` 数组作为用户消息，传递给 `geminiClient`，从而触发我们在 `GeminiClient` 中注入的解析逻辑。

## 4. 最终效果

通过以上修改，我们成功地建立了一个从命令行参数到核心服务，再到 API 请求预处理的完整数据流。用户现在可以通过 `--file` 参数在非交互式模式下提交本地文件，`open-gemini-cli` 会在本地完成解析和内容注入，极大地扩展了工具的适用性和兼容性。
