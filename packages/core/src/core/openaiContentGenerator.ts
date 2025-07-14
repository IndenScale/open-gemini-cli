import { Content, CountTokensRequest, CountTokensResponse, EmbedContentRequest, EmbedContentResponse, GenerateContentRequest, GenerateContentResult, GenerateContentStreamResult, ContentGenerator } from "@google/genai";
import OpenAI from 'openai';

export class OpenAIContentGenerator implements ContentGenerator {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateContent(request: GenerateContentRequest): Promise<GenerateContentResult> {
    throw new Error("Method not implemented.");
  }

  async generateContentStream(request: GenerateContentRequest): Promise<GenerateContentStreamResult> {
    throw new Error("Method not implemented.");
  }

  async countTokens(request: CountTokensRequest): Promise<CountTokensResponse> {
    throw new Error("Method not implemented.");
  }

  async embedContent(request: EmbedContentRequest): Promise<EmbedContentResponse> {
    throw new Error("Method not implemented.");
  }
}