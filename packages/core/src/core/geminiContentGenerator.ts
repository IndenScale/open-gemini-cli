/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GoogleGenAI,
} from '@google/genai';
import { ContentGenerator, ContentGeneratorConfig } from './contentGenerator.js';

export function createGeminiContentGenerator(
  config: ContentGeneratorConfig,
): ContentGenerator {
    const version = process.env.CLI_VERSION || process.version;
    const httpOptions = {
        headers: {
        'User-Agent': `GeminiCLI/${version} (${process.platform}; ${process.arch})`,
        },
    };
    const googleGenAI = new GoogleGenAI({
        apiKey: config.apiKey === '' ? undefined : config.apiKey,
        vertexai: config.vertexai,
        httpOptions,
    });

    return googleGenAI.models;
}
