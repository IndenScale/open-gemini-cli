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
    FinishReason
    //ContentEmbedding, // 导入 ContentEmbedding 类型以供参考
  } from '@google/genai';
import { ContentGenerator, ContentGeneratorConfig } from './contentGenerator.js';

export class OpenAIContentGenerator implements ContentGenerator {
    constructor(private readonly config: ContentGeneratorConfig) {}
    /**
	 * Mocks generating content in a non-streaming fashion.
	 * Returns a complete response object that satisfies the GenerateContentResponse type.
	 */
	async generateContent(
		request: GenerateContentParameters,
	): Promise<GenerateContentResponse> {
		console.log('Mock generateContent called with request:', request);
		console.log('Using config:', this.config);

		// FIX: Check if the consumer is expecting a JSON response.
		if (request.config?.responseMimeType === 'application/json') {
			const mockJsonResponse = JSON.stringify({ speaker: 'user' });
			return {
				candidates: [
					{
						content: {
							role: 'model',
							parts: [{ text: mockJsonResponse }],
						},
						finishReason: FinishReason.STOP,
						index: 0,
						safetyRatings: [],
					},
				],
				usageMetadata: {
					promptTokenCount: 5,
					candidatesTokenCount: 5,
					totalTokenCount: 10,
				},
				text: mockJsonResponse,
				data: undefined,
				functionCalls: undefined,
				executableCode: undefined,
				codeExecutionResult: undefined,
			};
		}

		// Return a more realistic, complete text response for standard requests.
		return {
			candidates: [
				{
					content: {
						role: 'model',
						parts: [{ text: 'This is a complete, non-streamed response.' }],
					},
					finishReason: FinishReason.STOP,
					index: 0,
					safetyRatings: [],
				},
			],
			usageMetadata: {
				promptTokenCount: 10,
				candidatesTokenCount: 8,
				totalTokenCount: 18,
			},
			text: 'This is a complete, non-streamed response.',
			data: undefined,
			functionCalls: undefined,
			executableCode: undefined,
			codeExecutionResult: undefined,
		};
	}

	/**
	 * Mocks generating content as a stream.
	 * This generator now yields multiple chunks to better simulate a real-world stream.
	 */
	async generateContentStream(
		request: GenerateContentParameters,
	): Promise<AsyncGenerator<GenerateContentResponse>> {
		console.log('Mock generateContentStream called with request:', request);
		console.log('Using config:', this.config);

		const baseResponse = {
			usageMetadata: {
				promptTokenCount: 15,
				candidatesTokenCount: 25,
				totalTokenCount: 40,
			},
			data: undefined,
			functionCalls: undefined,
			executableCode: undefined,
			codeExecutionResult: undefined,
		};

		async function* generator(): AsyncGenerator<GenerateContentResponse> {
			// Yield first chunk of text
			yield {
				...baseResponse,
				text: 'Hello! ',
				candidates: [{ content: { role: 'model', parts: [{ text: 'Hello! ' }] }, index: 0 }],
			};

			// Yield second chunk of text
			yield {
				...baseResponse,
				text: 'How can I help you today?',
				candidates: [{ content: { role: 'model', parts: [{ text: 'How can I help you today?' }] }, index: 0 }],
			};
		}
		return generator();
	}

	/**
	 * Mocks counting tokens.
	 */
	async countTokens(
		request: CountTokensParameters,
	): Promise<CountTokensResponse> {
		console.log('Mock countTokens called with request:', request);
		console.log('Using config:', this.config);
		return {
			totalTokens: 50, // Return a non-zero mock value
		};
	}

	/**
	 * Mocks embedding content.
	 * Returns a response where `embeddings` contains a sample embedding vector.
	 */
	async embedContent(
		request: EmbedContentParameters,
	): Promise<EmbedContentResponse> {
		console.log('Mock embedContent called with request:', request);
		console.log('Using config:', this.config);
		// FIX: `embeddings` must be an array (ContentEmbedding[]).
		// Provide a realistic-looking mock embedding.
		return {
			embeddings: [
				{
					values: [0.01, 0.02, 0.03, 0.04, 0.05, -0.01, -0.02, -0.03, -0.04, -0.05],
				}
			],
		};
	}
}
