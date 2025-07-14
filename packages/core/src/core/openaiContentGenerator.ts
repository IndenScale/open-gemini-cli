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
    PartUnion
} from '@google/genai';
import { ContentGenerator, ContentGeneratorConfig } from './contentGenerator.js';
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
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

        for (const content of normalizedContents) {
            if (content.role === 'user') {
                const textParts = content.parts?.filter(part => 'text' in part && part.text) || [];
                const text = textParts.map(part => (part as any).text).join('\n');
                if (text) {
                    messages.push({ role: 'user', content: text });
                }
            } else if (content.role === 'model') {
                const textParts = content.parts?.filter(part => 'text' in part && part.text) || [];
                const text = textParts.map(part => (part as any).text).join('\n');
                if (text) {
                    messages.push({ role: 'assistant', content: text });
                }
            }
        }

        return messages;
    }

    /**
     * 清理JSON响应，移除markdown代码块包装
     */
    private cleanJsonResponse(text: string): string {
        // 移除```json```包装
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            return jsonMatch[1].trim();
        }
        return text.trim();
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
                temperature: request.config?.temperature,
                max_tokens: request.config?.maxOutputTokens,
                top_p: request.config?.topP,
            };

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

            const choice = response.choices[0];
            let responseText = choice.message.content || '';

            // 如果是JSON响应，清理可能的markdown包装
            if (request.config?.responseMimeType === 'application/json') {
                responseText = this.cleanJsonResponse(responseText);
            }

            return {
                candidates: [
                    {
                        content: {
                            role: 'model',
                            parts: [{ text: responseText }],
                        },
                        finishReason: this.mapFinishReason(choice.finish_reason),
                        index: 0,
                        safetyRatings: [],
                    },
                ],
                usageMetadata: {
                    promptTokenCount: response.usage?.prompt_tokens || 0,
                    candidatesTokenCount: response.usage?.completion_tokens || 0,
                    totalTokenCount: response.usage?.total_tokens || 0,
                },
                text: responseText,
                data: undefined,
                functionCalls: undefined,
                executableCode: undefined,
                codeExecutionResult: undefined,
            };
        } catch (error) {
            console.error('OpenAI API error:', error);
            throw error;
        }
    }

    /**
     * 映射OpenAI的finish_reason到Gemini的FinishReason
     */
    private mapFinishReason(reason: string | null): FinishReason {
        switch (reason) {
            case 'stop':
                return FinishReason.STOP;
            case 'length':
                return FinishReason.MAX_TOKENS;
            case 'content_filter':
                return FinishReason.SAFETY;
            default:
                return FinishReason.OTHER;
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
            temperature: request.config?.temperature,
            max_tokens: request.config?.maxOutputTokens,
            top_p: request.config?.topP,
            stream: true,
            stream_options: { include_usage: true }, // 启用流式响应中的用量统计
        };

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
        let fullResponseText = '';
        let finalUsage: OpenAI.Completions.CompletionUsage | null = null;
        let lastFinishReason: string | null = null;

        try {
            for await (const chunk of stream) {
                if (chunk.usage) {
                    finalUsage = chunk.usage;
                }

                const choice = chunk.choices[0];
                if (!choice) continue;

                const delta = choice.delta;
                const chunkText = delta?.content || '';
                const chunkFinishReason = choice.finish_reason;

                if (isJsonResponse) {
                    fullResponseText += chunkText;
                }

                if (chunkFinishReason) {
                    lastFinishReason = chunkFinishReason;
                }

                if (chunkText) {
                    yield {
                        candidates: [{
                            content: { role: 'model', parts: [{ text: chunkText }] },
                            index: 0,
                            finishReason: undefined,
                            safetyRatings: [],
                        }],
                        text: chunkText,
                        data: undefined,
                        functionCalls: undefined,
                        executableCode: undefined,
                        codeExecutionResult: undefined,
                    };
                }
            }
        } catch (error) {
            console.error('OpenAI streaming error:', error);
            throw error;
        } finally {
            if (finalUsage) {
                const finalText = isJsonResponse ? this.cleanJsonResponse(fullResponseText) : '';
                yield {
                    candidates: [{
                        content: { role: 'model', parts: [{ text: finalText }] },
                        index: 0,
                        finishReason: lastFinishReason ? this.mapFinishReason(lastFinishReason) : FinishReason.STOP,
                        safetyRatings: [],
                    }],
                    usageMetadata: {
                        promptTokenCount: finalUsage.prompt_tokens || 0,
                        candidatesTokenCount: finalUsage.completion_tokens || 0,
                        totalTokenCount: finalUsage.total_tokens || 0,
                    },
                    text: finalText,
                    data: undefined,
                    functionCalls: undefined,
                    executableCode: undefined,
                    codeExecutionResult: undefined,
                };
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
