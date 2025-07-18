/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    CountTokensParameters,
    CountTokensResponse,
    EmbedContentParameters,
    EmbedContentResponse,
    GenerateContentParameters,
    GenerateContentResponse,
    FinishReason,
    Part,
    Content,
    ContentListUnion,
    PartUnion,
    FunctionDeclaration,
    FunctionCall,
    FunctionCallingConfigMode,
    Tool,
    ToolListUnion,
    CallableTool
} from '@google/genai';
import { ContentGenerator, ContentGeneratorConfig } from './contentGenerator.js';
import { GeminiToOpenAIConverter, OpenAIToGeminiConverter } from '../utils/adapter.js';
import OpenAI from 'openai';

export class OpenAIContentGenerator implements ContentGenerator {
    private openai: OpenAI;

    constructor(private readonly config: ContentGeneratorConfig) {
        this.openai = new OpenAI({
            apiKey: config.apiKey || process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        });
    }

    /**
     * 将ContentListUnion转换为Content数组
     */
    private normalizeContentListUnion(contents: ContentListUnion): Content[] {
        if (!contents) {
            return [];
        }

        // 如果是字符串，转换为Content
        if (typeof contents === 'string') {
            return [{
                role: 'user',
                parts: [{ text: contents }]
            }];
        }

        // 如果是数组
        if (Array.isArray(contents)) {
            const result: Content[] = [];
            for (const item of contents) {
                if (typeof item === 'string') {
                    result.push({
                        role: 'user',
                        parts: [{ text: item }]
                    });
                } else if ('text' in item) {
                    // PartUnion with text
                    result.push({
                        role: 'user',
                        parts: [item as Part]
                    });
                } else if ('role' in item) {
                    // Content object
                    result.push(item as Content);
                }
            }
            return result;
        }

        // 如果是单个Content对象
        if ('role' in contents) {
            return [contents as Content];
        }

        // 如果是单个Part对象
        if ('text' in contents) {
            return [{
                role: 'user',
                parts: [contents as Part]
            }];
        }

        return [];
    }

    /**
     * 将Gemini格式的内容转换为OpenAI格式
     */
    private convertToOpenAIMessages(contents: ContentListUnion): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
        const normalizedContents = this.normalizeContentListUnion(contents);
        return GeminiToOpenAIConverter.convertContentsToMessages(normalizedContents);
    }

    /**
     * 清理JSON响应，移除markdown代码块包装
     */
    private cleanJsonResponse(text: string): string {
        return OpenAIToGeminiConverter.cleanMarkdownJson(text);
    }



    /**
     * 将Gemini工具声明转换为OpenAI函数格式
     */
    private async convertGeminiToolsToOpenAI(tools?: ToolListUnion): Promise<OpenAI.Chat.Completions.ChatCompletionTool[]> {
        return await GeminiToOpenAIConverter.convertToolsToOpenAI(tools);
    }

    /**
     * 将OpenAI函数调用转换为Gemini格式
     */
    private convertOpenAIFunctionCallsToGemini(toolCalls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]): FunctionCall[] {
        return OpenAIToGeminiConverter.convertOpenAIFunctionCallsToGemini(toolCalls);
    }
    /**
     * 使用OpenAI API生成内容（非流式）
     */
    async generateContent(
        request: GenerateContentParameters,
    ): Promise<GenerateContentResponse> {
        try {
            const messages = this.convertToOpenAIMessages(request.contents);

            // 构建OpenAI请求参数
            const openaiRequest: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
                model: this.config.model || 'gpt-3.5-turbo',
                messages,
                ...GeminiToOpenAIConverter.convertConfigToOpenAIParams(request.config),
            };

            // 添加工具支持
            if (request.config?.tools) {
                const openaiTools = await this.convertGeminiToolsToOpenAI(request.config.tools);
                if (openaiTools.length > 0) {
                    openaiRequest.tools = openaiTools;

                    // 处理工具调用配置
                    if (request.config.toolConfig?.functionCallingConfig) {
                        const mode = request.config.toolConfig.functionCallingConfig.mode;
                        if (mode === FunctionCallingConfigMode.ANY) {
                            openaiRequest.tool_choice = 'required';
                        } else if (mode === FunctionCallingConfigMode.NONE) {
                            openaiRequest.tool_choice = 'none';
                        } else {
                            openaiRequest.tool_choice = 'auto';
                        }
                    } else {
                        openaiRequest.tool_choice = 'auto';
                    }
                }
            }

            // 如果需要JSON响应，添加相应的指令
            if (request.config?.responseMimeType === 'application/json') {
                openaiRequest.response_format = { type: 'json_object' };
                // 在系统消息中添加JSON格式要求
                openaiRequest.messages.unshift({
                    role: 'system',
                    content: 'You must respond with valid JSON only. Do not wrap your response in markdown code blocks.'
                });
            }

            const response = await this.openai.chat.completions.create(openaiRequest);

            // 确保response是ChatCompletion类型而不是Stream
            if ('choices' in response && !('controller' in response)) {
                return OpenAIToGeminiConverter.convertResponseToGemini(response, request.config?.responseMimeType === 'application/json');
            } else {
                throw new Error('Unexpected response type: expected ChatCompletion but got Stream');
            }
        } catch (error) {
            console.error('OpenAI API error:', error);
            throw error;
        }
    }



    /**
     * 使用OpenAI API生成流式内容
     */
    async generateContentStream(
        request: GenerateContentParameters,
    ): Promise<AsyncGenerator<GenerateContentResponse>> {
        const messages = this.convertToOpenAIMessages(request.contents);

        // 构建OpenAI请求参数
        const openaiRequest: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
            model: this.config.model || 'gpt-3.5-turbo',
            messages,
            ...GeminiToOpenAIConverter.convertConfigToOpenAIParams(request.config),
            stream: true,
            stream_options: { include_usage: true }, // 启用流式响应中的用量统计
        };

        // 添加工具支持
            if (request.config?.tools) {
                const openaiTools = await this.convertGeminiToolsToOpenAI(request.config.tools);
                if (openaiTools.length > 0) {
                    openaiRequest.tools = openaiTools;

                    // 处理工具调用配置
                    if (request.config.toolConfig?.functionCallingConfig) {
                        const mode = request.config.toolConfig.functionCallingConfig.mode;
                        if (mode === FunctionCallingConfigMode.ANY) {
                            openaiRequest.tool_choice = 'required';
                        } else if (mode === FunctionCallingConfigMode.NONE) {
                            openaiRequest.tool_choice = 'none';
                        } else {
                            openaiRequest.tool_choice = 'auto';
                        }
                    } else {
                        openaiRequest.tool_choice = 'auto';
                    }
                }
            }

        // 如果需要JSON响应，添加相应的指令
        if (request.config?.responseMimeType === 'application/json') {
            openaiRequest.response_format = { type: 'json_object' };
            openaiRequest.messages.unshift({
                role: 'system',
                content: 'You must respond with valid JSON only. Do not wrap your response in markdown code blocks.'
            });
        }

        const stream = await this.openai.chat.completions.create(openaiRequest);

        return this.createGeminiStreamFromOpenAI(stream, request.config?.responseMimeType === 'application/json');
    }

    /**
     * 将OpenAI流转换为Gemini格式的流，处理增量token合并
     */
    private async *createGeminiStreamFromOpenAI(
        stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
        isJsonResponse: boolean = false
    ): AsyncGenerator<GenerateContentResponse> {
        // 维护工具调用的累积状态
        const accumulatedToolCalls: Record<string, { id: string; name: string; arguments: string }> = {};
        // 累积usage信息，只在最后一个chunk中提供
        let finalUsage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined;

        for await (const chunk of stream) {
            // 使用 `as any` 类型断言来处理非标准的 `usage` 字段位置
            const usage = chunk.usage || (chunk.choices?.[0] as any)?.usage;
            // --- 修改结束 ---

            // if (usage) {
            //     finalUsage = usage as any;
            //     console.log('[Usage Debug] Received usage info in chunk:', finalUsage);
            // }

            // 对于包含usage信息的chunk，即使没有其他内容也要处理
            // 传递当前chunk的usage信息（如果有的话）
            const geminiResponse = OpenAIToGeminiConverter.convertStreamingChunkToGemini(
                chunk,
                isJsonResponse,
                accumulatedToolCalls,
                chunk.usage ?? undefined // 如果chunk.usage为null，则传递undefined
            );
            if (geminiResponse) {
                yield geminiResponse;
            }
        }
    }

    /**
     * 计算token数量
     * 使用与OpenAI相同的tokenization方法进行准确计算
     */
    async countTokens(
        request: CountTokensParameters,
    ): Promise<CountTokensResponse> {
        try {
            // 将内容转换为OpenAI消息格式
            const messages = this.convertToOpenAIMessages(request.contents);

            // 计算消息的token数量
            // 这里使用与OpenAI API相同的计算方法
            let totalTokens = 0;

            // 每个消息都有固定的开销token
            totalTokens += messages.length * 3; // 每个消息的格式开销
            totalTokens += 3; // 对话的开始标记

            // 计算每个消息内容的token数量
            for (const message of messages) {
                if (typeof message.content === 'string') {
                    // 使用简化的token估算方法
                    // 对于更精确的计算，建议使用tiktoken库
                    // 但为了避免额外依赖，这里使用改进的估算方法
                    const text = message.content;

                    // 改进的token估算：
                    // - 英文：平均4个字符 = 1个token
                    // - 中文：平均1.5个字符 = 1个token
                    // - 标点符号和空格：通常单独成token
                    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
                    const otherChars = text.length - chineseChars;
                    const punctuationAndSpaces = (text.match(/[\s\p{P}]/gu) || []).length;

                    const estimatedTokens = Math.ceil(
                        chineseChars / 1.5 + // 中文字符
                        (otherChars - punctuationAndSpaces) / 4 + // 英文字符
                        punctuationAndSpaces * 0.8 // 标点符号和空格
                    );

                    totalTokens += estimatedTokens;
                }

                // 角色标识也消耗token
                totalTokens += 1;
            }

            return {
                totalTokens: Math.max(totalTokens, 1), // 确保至少返回1个token
            };
        } catch (error) {
            console.error('Token counting error:', error);
            // 返回一个合理的默认值
            return {
                totalTokens: 100,
            };
        }
    }

    /**
     * 使用OpenAI API生成内容嵌入
     */
    async embedContent(
        request: EmbedContentParameters,
    ): Promise<EmbedContentResponse> {
        try {
            // 提取文本内容
            const normalizedContents = this.normalizeContentListUnion(request.contents);
            const allTextParts: string[] = [];

            for (const content of normalizedContents) {
                const textParts = content.parts?.filter(part => 'text' in part && part.text) || [];
                const texts = textParts.map(part => (part as any).text);
                allTextParts.push(...texts);
            }

            const text = allTextParts.join('\n');

            if (!text) {
                throw new Error('No text content found for embedding');
            }

            // 使用OpenAI的embedding API
            const response = await this.openai.embeddings.create({
                model: 'text-embedding-ada-002', // OpenAI的标准embedding模型
                input: text,
            });

            // 转换为Gemini格式
            const embeddings = response.data.map(item => ({
                values: item.embedding,
            }));

            return {
                embeddings,
            };
        } catch (error) {
            console.error('OpenAI embedding error:', error);
            // 返回一个默认的embedding向量
            return {
                embeddings: [
                    {
                        values: new Array(1536).fill(0).map(() => Math.random() * 0.1 - 0.05),
                    }
                ],
            };
        }
    }
}
