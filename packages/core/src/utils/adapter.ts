/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    Content,
    ContentListUnion,
    Part,
    PartUnion,
    Tool,
    ToolListUnion,
    FunctionCall,
    FunctionDeclaration,
    GenerateContentResponse,
    FinishReason,
} from '@google/genai';
import OpenAI from 'openai';

/**
 * Gemini 格式到 OpenAI 格式的转换器
 */
export class GeminiToOpenAIConverter {
    /**
     * 将 Gemini contents 转换为 OpenAI messages
     */
    static convertContentsToMessages(contents: Content[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

        for (let i = 0; i < contents.length; i++) {
            const content = contents[i];
            const role = content.role || 'user';
            const parts = content.parts || [];

            if (role === 'user') {
                // 处理用户消息
                let combinedText = '';
                const toolMessages: OpenAI.Chat.Completions.ChatCompletionToolMessageParam[] = [];

                for (const part of parts) {
                    if (this.isTextPart(part)) {
                        combinedText += part.text;
                    } else if (this.isFunctionResponsePart(part)) {
                        // 转换函数响应为工具消息
                        const funcResponse = part.functionResponse;
                        const toolMessage: OpenAI.Chat.Completions.ChatCompletionToolMessageParam = {
                            role: 'tool',
                            tool_call_id: `${funcResponse?.name || 'unknown'}:0`,
                            content: JSON.stringify(funcResponse?.response || {}),
                        };
                        toolMessages.push(toolMessage);
                    }
                }

                // 添加用户消息
                if (combinedText.trim()) {
                    messages.push({
                        role: 'user',
                        content: combinedText.trim(),
                    });
                }

                // 添加工具消息
                messages.push(...toolMessages);
            } else if (role === 'model') {
                // 处理模型消息
                let combinedText = '';
                const toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] = [];

                for (const part of parts) {
                    if (this.isTextPart(part)) {
                        combinedText += part.text;
                    } else if (this.isFunctionCallPart(part)) {
                        // 检查这是否是最后一个消息且包含 functionCall
                        const isLastMessage = i === contents.length - 1;

                        // 检查是否有对应的 functionResponse
                        let hasResponse = false;
                        for (let j = i + 1; j < contents.length; j++) {
                            const nextContent = contents[j];
                            if (nextContent.role === 'user') {
                                for (const nextPart of nextContent.parts || []) {
                                    if (this.isFunctionResponsePart(nextPart)) {
                                        const funcName = part.functionCall?.name;
                                        const respName = nextPart.functionResponse?.name;
                                        if (funcName === respName) {
                                            hasResponse = true;
                                            break;
                                        }
                                    }
                                }
                                if (hasResponse) break;
                            }
                        }

                        // 如果是最后一个消息且没有对应的响应，跳过这个 functionCall
                        if (isLastMessage && !hasResponse) {
                            continue;
                        }

                        // 转换函数调用为工具调用
                        const funcCall = part.functionCall;
                        if (funcCall) {
                            const toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall = {
                                id: `${funcCall.name || 'unknown'}:0`,
                                type: 'function',
                                function: {
                                    name: funcCall.name || '',
                                    arguments: JSON.stringify(funcCall.args || {}),
                                },
                            };
                            toolCalls.push(toolCall);
                        }
                    }
                }

                // 只有在有内容或工具调用时才添加助手消息
                if (combinedText.trim() || toolCalls.length > 0) {
                    const assistantMessage: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = {
                        role: 'assistant',
                        content: combinedText.trim() || null,
                    };
                    if (toolCalls.length > 0) {
                        assistantMessage.tool_calls = toolCalls;
                    }
                    messages.push(assistantMessage);
                }
            }
        }

        return messages;
    }

    /**
     * 将 Gemini 配置转换为 OpenAI 参数
     */
    static convertConfigToOpenAIParams(config?: any): Partial<OpenAI.Chat.Completions.ChatCompletionCreateParams> {
        if (!config) {
            return {};
        }

        const openaiParams: Partial<OpenAI.Chat.Completions.ChatCompletionCreateParams> = {};

        // 参数映射
        if (config.temperature !== undefined) {
            openaiParams.temperature = config.temperature;
        }
        if (config.maxOutputTokens !== undefined) {
            openaiParams.max_tokens = config.maxOutputTokens;
        }
        if (config.topP !== undefined) {
            openaiParams.top_p = config.topP;
        }
        if (config.stopSequences !== undefined) {
            openaiParams.stop = config.stopSequences;
        }

        return openaiParams;
    }

    /**
     * 转换工具定义
     */
    static async convertToolsToOpenAI(tools?: ToolListUnion): Promise<OpenAI.Chat.Completions.ChatCompletionTool[]> {
        if (!tools || tools.length === 0) {
            return [];
        }

        const openaiTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [];

        for (const toolUnion of tools) {
            // 处理不同类型的工具
            let tool: Tool;
            if ('tool' in toolUnion && typeof toolUnion.tool === 'function') {
                // CallableTool 类型，需要调用函数获取工具定义
                tool = await (toolUnion as any).tool();
            } else {
                tool = toolUnion as Tool;
            }

            if (tool.functionDeclarations) {
                for (const funcDecl of tool.functionDeclarations) {
                    // 构建符合OpenAI FunctionParameters类型的参数对象
                    let parameters: { [key: string]: unknown };

                    if (funcDecl.parameters) {
                        parameters = this.convertGeminiSchemaToOpenAI(funcDecl.parameters);
                    } else if (funcDecl.parametersJsonSchema) {
                        parameters = this.convertGeminiSchemaToOpenAI(funcDecl.parametersJsonSchema);
                    } else {
                        // 为没有参数的函数提供有效的空schema
                        parameters = {
                            type: 'object',
                            properties: {},
                            additionalProperties: false
                        };
                    }

                    const openaiTool: OpenAI.Chat.Completions.ChatCompletionTool = {
                        type: 'function',
                        function: {
                            name: funcDecl.name || '',
                            description: funcDecl.description || '',
                            parameters,
                        },
                    };
                    openaiTools.push(openaiTool);
                }
            }
        }

        return openaiTools;
    }

    /**
     * 将Gemini schema转换为OpenAI兼容的JSON schema
     */
    private static convertGeminiSchemaToOpenAI(schema: any): { [key: string]: unknown } {
        if (!schema || typeof schema !== 'object') {
            return {
                type: 'object',
                properties: {},
                additionalProperties: false
            };
        }

        const converted: { [key: string]: unknown } = { ...schema };

        // 转换type字段：将Gemini的Type枚举转换为字符串
        if (converted.type) {
            converted.type = String(converted.type).toLowerCase();
        }

        // 递归处理properties
        if (converted.properties && typeof converted.properties === 'object') {
            const newProperties: { [key: string]: unknown } = {};
            for (const [key, value] of Object.entries(converted.properties)) {
                newProperties[key] = this.convertGeminiSchemaToOpenAI(value);
            }
            converted.properties = newProperties;
        }

        // 递归处理items（用于数组类型）
        if (converted.items) {
            converted.items = this.convertGeminiSchemaToOpenAI(converted.items);
        }

        // 递归处理anyOf
        if (converted.anyOf && Array.isArray(converted.anyOf)) {
            converted.anyOf = converted.anyOf.map((item: any) => this.convertGeminiSchemaToOpenAI(item));
        }

        // 转换数值字段
        if (converted.minItems) {
            converted.minItems = Number(converted.minItems);
        }
        if (converted.minLength) {
            converted.minLength = Number(converted.minLength);
        }

        return converted;
    }



     // 类型守卫函数
     private static isTextPart(part: PartUnion): part is { text: string } {
         return typeof part === 'object' && part !== null && 'text' in part;
     }

     private static isFunctionCallPart(part: PartUnion): part is { functionCall: FunctionCall } {
         return typeof part === 'object' && part !== null && 'functionCall' in part;
     }

     private static isFunctionResponsePart(part: PartUnion): part is { functionResponse: any } {
         return typeof part === 'object' && part !== null && 'functionResponse' in part;
     }
}

/**
 * OpenAI 格式到 Gemini 格式的转换器
 */
export class OpenAIToGeminiConverter {
    /**
     * 清理 markdown 格式的 JSON 代码块，提取纯 JSON 内容
     */
    static cleanMarkdownJson(content: string): string {
        // 匹配 ```json\n...内容...\n``` 格式
        const jsonPattern = /^```json\s*\n([\s\S]*?)\n```$/;
        const match = content.trim().match(jsonPattern);

        if (match) {
            // 提取 JSON 内容
            return match[1];
        }

        // 如果不匹配模式，返回原内容
        return content;
    }

    /**
     * 将OpenAI函数调用转换为Gemini格式
     */
    static convertOpenAIFunctionCallsToGemini(toolCalls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]): FunctionCall[] {
        if (!toolCalls || toolCalls.length === 0) {
            return [];
        }

        return toolCalls.map(toolCall => ({
             id: toolCall.id,
             name: toolCall.function.name,
             args: JSON.parse(toolCall.function.arguments || '{}'),
         }));
     }

    /**
     * 将 OpenAI 响应转换为 Gemini 格式
     */
    static convertResponseToGemini(response: OpenAI.Chat.Completions.ChatCompletion, isJsonResponse: boolean = false): GenerateContentResponse {
        const choice = response.choices[0];
        const message = choice.message;

        console.log('[OpenAI Response Debug] Message content:', message.content);
        console.log('[OpenAI Response Debug] Tool calls:', message.tool_calls?.length || 0);
        if (message.tool_calls) {
            console.log('[OpenAI Response Debug] Tool call details:', message.tool_calls.map(tc => ({ name: tc.function.name, args: tc.function.arguments })));
        }

        // 构建 parts
        const parts: Part[] = [];

        // 添加文本内容
        if (message.content) {
            let content = message.content;
            // 如果是JSON响应，清理 markdown 格式的 JSON 代码块
            if (isJsonResponse) {
                content = this.cleanMarkdownJson(content);
            }
            parts.push({ text: content });
        }

        // 添加工具调用
        if (message.tool_calls) {
            console.log('[OpenAI Response Debug] Converting', message.tool_calls.length, 'tool calls to Gemini format');
            for (const toolCall of message.tool_calls) {
                const functionCallPart: Part = {
                    functionCall: {
                        name: toolCall.function.name,
                        args: JSON.parse(toolCall.function.arguments),
                    },
                };
                parts.push(functionCallPart);
            }
        }

        // 映射完成原因
        const finishReasonMapping: Record<string, FinishReason> = {
            stop: FinishReason.STOP,
            length: FinishReason.MAX_TOKENS,
            content_filter: FinishReason.SAFETY,
            tool_calls: FinishReason.STOP,
            function_call: FinishReason.STOP,
        };
        const finishReason = finishReasonMapping[choice.finish_reason || 'stop'] || FinishReason.STOP;

        // 构建响应
        const geminiResponse: GenerateContentResponse = {
            candidates: [
                {
                    content: {
                        parts,
                        role: 'model',
                    },
                    finishReason,
                    index: 0,
                    safetyRatings: [],
                },
            ],
            text: message.content || '',
            data: undefined,
            functionCalls: undefined,
            executableCode: undefined,
            codeExecutionResult: undefined,
        };

        // 添加使用信息
        if (response.usage) {
            geminiResponse.usageMetadata = {
                promptTokenCount: response.usage.prompt_tokens,
                candidatesTokenCount: response.usage.completion_tokens,
                totalTokenCount: response.usage.total_tokens,
            };
        }

        return geminiResponse;
    }

    /**
     * 转换流式响应块为 Gemini 格式
     */
    static convertStreamingChunkToGemini(
        chunk: OpenAI.Chat.Completions.ChatCompletionChunk,
        isJsonResponse: boolean = false,
        accumulatedToolCalls: Record<string, { id: string; name: string; arguments: string }> = {},
        finalUsage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
    ): GenerateContentResponse | null {
        if (finalUsage !== undefined) {
            console.log('[Adapter Debug] Processing chunk with finalUsage:', finalUsage);
        }

        if (!chunk.choices || chunk.choices.length === 0) {
            return null;
        }

        const choice = chunk.choices[0];

        // --- 修改开始 ---
        // 如果 choice.delta 不存在，则视为空对象，而不是直接返回 null
        // 这样可以继续处理 finish_reason 和 finalUsage
        const delta = choice.delta || {};
        // --- 修改结束 ---
        const parts: Part[] = [];
        let functionCalls: FunctionCall[] | undefined = undefined;

        // 处理文本内容
        if (delta.content) {
            let content = delta.content;
            // 如果是JSON响应且内容看起来是完整的，清理markdown格式
            if (isJsonResponse && content.includes('```')) {
                content = this.cleanMarkdownJson(content);
            }
            parts.push({ text: content });
        }

        // 处理工具调用（需要累积）
        if (delta.tool_calls) {
            // console.log('[OpenAI Stream Debug] Received tool calls in chunk:', delta.tool_calls.length);
            for (const toolCall of delta.tool_calls) {
                // 使用 index 作为主键，因为流式响应中 id 经常为 None
                const toolCallIndex = toolCall.index !== undefined ? toolCall.index : 0;
                const toolCallKey = `tool_${toolCallIndex}`;

                // console.log('[OpenAI Stream Debug] Tool call:', { name: toolCall.function?.name, args: toolCall.function?.arguments });

                // 初始化累积状态
                if (!(toolCallKey in accumulatedToolCalls)) {
                    accumulatedToolCalls[toolCallKey] = {
                        id: '',
                        name: '',
                        arguments: ''
                    };
                }

                // 累积工具调用 ID（只在第一次出现时设置）
                if (toolCall.id && !accumulatedToolCalls[toolCallKey].id) {
                    accumulatedToolCalls[toolCallKey].id = toolCall.id;
                }

                // 累积函数名（只在第一次出现时设置）
                if (toolCall.function?.name && !accumulatedToolCalls[toolCallKey].name) {
                    accumulatedToolCalls[toolCallKey].name = toolCall.function.name;
                }

                // 累积函数参数
                if (toolCall.function?.arguments) {
                    accumulatedToolCalls[toolCallKey].arguments += toolCall.function.arguments;
                }

                // 尝试解析完整的 JSON
                try {
                    const argsStr = accumulatedToolCalls[toolCallKey].arguments;
                    const name = accumulatedToolCalls[toolCallKey].name;

                    if (argsStr && name) {
                        const parsedArgs = JSON.parse(argsStr);
                        // JSON 完整，创建函数调用部分
                        const functionCallPart: Part = {
                            functionCall: {
                                name: name,
                                args: parsedArgs,
                            },
                        };
                        parts.push(functionCallPart);
                         console.log('[Tool Call Debug] Successfully parsed complete tool call:');
                         console.log('  - Function Name:', name);
                         console.log('  - Arguments:', JSON.stringify(parsedArgs, null, 2));
                         console.log('  - Tool Call ID:', accumulatedToolCalls[toolCallKey].id);

                         // 同时设置到functionCalls字段，供Turn类使用
                         if (!functionCalls) {
                             functionCalls = [];
                         }
                         functionCalls.push({
                             name: name,
                             args: parsedArgs,
                             id: accumulatedToolCalls[toolCallKey].id
                         });

                         // 清理已完成的工具调用
                         delete accumulatedToolCalls[toolCallKey];
                     }
                 } catch (error) {
                     // JSON 不完整，继续累积
                     // console.log('[OpenAI Stream Debug] JSON incomplete, continuing accumulation for:', accumulatedToolCalls[toolCallKey].name);
                }
            }
        }

        // 如果没有内容、没有完成原因，且没有usage信息，则返回null
        // if (parts.length === 0 && !choice.finish_reason && !finalUsage) {
        //     return null;
        // }

        // 映射完成原因
        const finishReasonMapping: Record<string, FinishReason> = {
            stop: FinishReason.STOP,
            length: FinishReason.MAX_TOKENS,
            content_filter: FinishReason.SAFETY,
            tool_calls: FinishReason.STOP,
        };

        const geminiResponse: GenerateContentResponse = {
            candidates: [
                {
                    content: { parts, role: 'model' },
                    finishReason: choice.finish_reason
                        ? finishReasonMapping[choice.finish_reason] || FinishReason.STOP
                        : undefined,
                    index: 0,
                    safetyRatings: [],
                },
            ],
            text: delta.content || '',
            data: undefined,
            functionCalls: functionCalls,
            executableCode: undefined,
            codeExecutionResult: undefined,
        };

        // 添加usage信息（如果可用）
        if (finalUsage) {
            geminiResponse.usageMetadata = {
                promptTokenCount: finalUsage.prompt_tokens,
                candidatesTokenCount: finalUsage.completion_tokens,
                totalTokenCount: finalUsage.total_tokens,
            };
            // console.log('[Usage Debug] Added usage metadata to response:', geminiResponse.usageMetadata);
        }

        return geminiResponse;
    }
}