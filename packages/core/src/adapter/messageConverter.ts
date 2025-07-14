import { Content, GenerateContentResponse } from "@google/genai";
import { ChatCompletionMessageParam, ChatCompletion, ChatCompletionChunk } from "openai/resources";

/**
 * Converts Gemini's Content[] history to OpenAI's ChatCompletionMessageParam[] format.
 * @param history The conversation history from Gemini.
 * @returns The conversation history in OpenAI's format.
 */
export function geminiToOpenAIMessages(history: Content[]): ChatCompletionMessageParam[] {
  // TODO: Implement the conversion logic here.
  // This will involve mapping roles and content parts.
  return [];
}

/**
 * Converts OpenAI's response (ChatCompletion or ChatCompletionChunk) to a Gemini GenerateContentResponse.
 * @param openAIResponse The response from OpenAI.
 * @returns The response in Gemini's format.
 */
export function openAIResponseToGeminiResponse(
  openAIResponse: ChatCompletion | ChatCompletionChunk
): GenerateContentResponse {
  // TODO: Implement the conversion logic here.
  // This will involve mapping back the response structure, including content, tool calls, and finish reasons.
  throw new Error("Not implemented");
}