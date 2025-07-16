/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { VLMService } from './fileParserService.js';
import { ContentGenerator } from '../core/contentGenerator.js';
import { GenerateContentParameters } from '@google/genai';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

/**
 * OpenAI-compatible VLM service implementation
 */
export class OpenAIVLMService implements VLMService {
  private openai: OpenAI | null = null;
  private isInitialized = false;

  constructor() {
    // Lazy initialization - don't throw error in constructor
  }

  private initialize(): void {
    if (this.isInitialized) return;

    const apiKey = process.env.OPENAI_VLM_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.OPENAI_VLM_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    if (!apiKey) {
      throw new Error('OpenAI VLM API key not configured');
    }

    this.openai = new OpenAI({
      apiKey,
      baseURL,
    });

    this.isInitialized = true;
  }

  async describeImage(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      this.initialize();

      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }

      console.log(`[VLM Debug] Processing image: ${mimeType}, size: ${buffer.length} bytes`);

      // Check if image is too large and needs compression
      const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB limit for OpenAI
      const processedBuffer = buffer;

      if (buffer.length > MAX_IMAGE_SIZE) {
        console.warn(`[VLM Debug] Image too large (${buffer.length} bytes), attempting to compress...`);
        // For now, we'll reject very large images
        throw new Error(`Image too large: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB (max: 20MB). Please use a smaller image.`);
      }

      const base64Image = processedBuffer.toString('base64');
      console.log(`[VLM Debug] Base64 length: ${base64Image.length} characters`);

      const model = process.env.OPENAI_VLM_MODEL || 'gpt-4o';
      console.log(`[VLM Debug] Using model: ${model}`);

      // Fix MIME type for OpenAI API
      let fixedMimeType = mimeType;
      if (mimeType === 'image/jpg') {
        fixedMimeType = 'image/jpeg';
      }

      console.log(`[VLM Debug] MIME type: ${mimeType} -> ${fixedMimeType}`);

      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please describe this image in detail, focusing on the key visual elements, text content if any, and overall context. Be concise but comprehensive.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${fixedMimeType};base64,${base64Image}`,
                detail: 'low' // Use 'low' detail to reduce token usage
              }
            }
          ]
        }
      ];

      const requestPayload = {
        model,
        messages,
        temperature: 0.3
      };

      console.log(`[VLM Debug] Making OpenAI API call...`);
      const response = await this.openai.chat.completions.create(requestPayload);

      const result = response.choices[0]?.message?.content || 'Unable to describe image';
      console.log(`[VLM Debug] OpenAI response received: ${result.substring(0, 100)}...`);

      return result;
    } catch (error) {
      console.error('[VLM Debug] OpenAI VLM service error:', error);

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('token limit')) {
          throw new Error('Image too large for processing. Please use a smaller image or reduce image quality.');
        }
        if (error.message.includes('Invalid request')) {
          throw new Error(`OpenAI API request invalid: ${error.message}`);
        }
      }

      throw error;
    }
  }
}

/**
 * Gemini-based VLM service implementation (fallback)
 */
export class GeminiVLMService implements VLMService {
  constructor(private contentGenerator: ContentGenerator) {}

  async describeImage(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      console.log(`[Gemini VLM Debug] Processing image: ${mimeType}, size: ${buffer.length} bytes`);

      // Check if image is too large
      const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB limit
      if (buffer.length > MAX_IMAGE_SIZE) {
        console.warn(`[Gemini VLM Debug] Image too large (${buffer.length} bytes)`);
        throw new Error(`Image too large: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB (max: 20MB). Please use a smaller image.`);
      }

      // Convert buffer to base64
      const base64Image = buffer.toString('base64');
      console.log(`[Gemini VLM Debug] Base64 length: ${base64Image.length} characters`);

      // Fix MIME type for Gemini API
      let fixedMimeType = mimeType;
      if (mimeType === 'image/jpg') {
        fixedMimeType = 'image/jpeg';
      }

      console.log(`[Gemini VLM Debug] MIME type: ${mimeType} -> ${fixedMimeType}`);

      // Create a request to describe the image
      const request: GenerateContentParameters = {
        model: 'gemini-2.0-flash-exp', // Use a model that supports vision
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: 'Please describe this image in detail, focusing on the key visual elements, text content if any, and overall context. Be concise but comprehensive.'
              },
              {
                inlineData: {
                  mimeType: fixedMimeType,
                  data: base64Image
                }
              }
            ]
          }
        ],
        config: {
          temperature: 0.3
        }
      };

      console.log(`[Gemini VLM Debug] Making Gemini API call...`);
      const response = await this.contentGenerator.generateContent(request);

      const result = response.text || 'Unable to describe image';
      console.log(`[Gemini VLM Debug] Gemini response received: ${result.substring(0, 100)}...`);

      return result;
    } catch (error) {
      console.error('[Gemini VLM Debug] Gemini VLM service error:', error);
      throw error;
    }
  }
}

/**
 * Composite VLM service with fallback mechanism
 */
export class CompositeVLMService implements VLMService {
  private openaiService: OpenAIVLMService | null = null;
  private geminiService: GeminiVLMService | null = null;
  private hasWarnedNoVLM = false;
  private contentGenerator?: ContentGenerator;

  constructor(contentGenerator?: ContentGenerator) {
    this.contentGenerator = contentGenerator;
    // Don't initialize services in constructor - use lazy initialization
  }

  private initializeServices(): void {
    // Try to initialize OpenAI service first (lazy)
    if (!this.openaiService) {
      try {
        this.openaiService = new OpenAIVLMService();
        console.log('VLM: Using OpenAI-compatible service');
      } catch (error) {
        console.debug('OpenAI VLM service not available:', error instanceof Error ? error.message : error);
        this.openaiService = null;
      }
    }

    // Initialize Gemini service as fallback if content generator is available
    if (!this.geminiService && this.contentGenerator) {
      try {
        this.geminiService = new GeminiVLMService(this.contentGenerator);
        console.log('VLM: Gemini service available as fallback');
      } catch (error) {
        console.debug('Gemini VLM service not available:', error instanceof Error ? error.message : error);
        this.geminiService = null;
      }
    }
  }

  async describeImage(buffer: Buffer, mimeType: string): Promise<string> {
    this.initializeServices();

    // Try OpenAI first
    if (this.openaiService) {
      try {
        return await this.openaiService.describeImage(buffer, mimeType);
      } catch (error) {
        console.warn('OpenAI VLM service failed, trying fallback:', error instanceof Error ? error.message : error);
        // Mark as failed so we don't try again
        this.openaiService = null;
      }
    }

    // Try Gemini as fallback
    if (this.geminiService) {
      try {
        return await this.geminiService.describeImage(buffer, mimeType);
      } catch (error) {
        console.warn('Gemini VLM service failed:', error instanceof Error ? error.message : error);
      }
    }

    // No services available
    if (!this.hasWarnedNoVLM) {
      console.warn('No VLM service available for image description. Please configure OPENAI_VLM_API_KEY or ensure Gemini service is available.');
      this.hasWarnedNoVLM = true;
    }

    return 'Image description not available - no VLM service configured';
  }
}