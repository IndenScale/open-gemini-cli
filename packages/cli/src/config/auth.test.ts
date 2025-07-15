/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from '@indenscale/open-gemini-cli-core';
import { vi } from 'vitest';
import { validateAuthMethod } from './auth.js';

vi.mock('./settings.js', () => ({
  loadEnvironment: vi.fn(),
}));

describe('validateAuthMethod', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {};
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return null for LOGIN_WITH_GOOGLE', () => {
    expect(validateAuthMethod(AuthType.LOGIN_WITH_GOOGLE)).toBeNull();
  });

  it('should return null for CLOUD_SHELL', () => {
    expect(validateAuthMethod(AuthType.CLOUD_SHELL)).toBeNull();
  });

  describe('USE_GEMINI', () => {
    it('should return null if GEMINI_API_KEY is set', () => {
      process.env.GEMINI_API_KEY = 'test-key';
      expect(validateAuthMethod(AuthType.USE_GEMINI)).toBeNull();
    });

    it('should return an error message if GEMINI_API_KEY is not set', () => {
      expect(validateAuthMethod(AuthType.USE_GEMINI)).toBe(
        'GEMINI_API_KEY environment variable not found. Add that to your environment and try again (no reload needed if using .env)!',
      );
    });
  });

  describe('USE_VERTEX_AI', () => {
    it('should return null if GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION are set', () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
      process.env.GOOGLE_CLOUD_LOCATION = 'test-location';
      expect(validateAuthMethod(AuthType.USE_VERTEX_AI)).toBeNull();
    });

    it('should return null if GOOGLE_API_KEY is set', () => {
      process.env.GOOGLE_API_KEY = 'test-api-key';
      expect(validateAuthMethod(AuthType.USE_VERTEX_AI)).toBeNull();
    });

    it('should return an error message if no required environment variables are set', () => {
      expect(validateAuthMethod(AuthType.USE_VERTEX_AI)).toBe(
        'When using Vertex AI, you must specify either:\n' +
          '• GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION environment variables.\n' +
          '• GOOGLE_API_KEY environment variable (if using express mode).\n' +
          'Update your environment and try again (no reload needed if using .env)!',
      );
    });
  });

  describe('OPENAI_COMPATIBLE', () => {
    it('should return null if OPENAI_API_KEY and OPENAI_BASE_URL are set', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.OPENAI_BASE_URL = 'test-base';
      expect(validateAuthMethod(AuthType.OPENAI_COMPATIBLE)).toBeNull();
    });

    it('should return an error message if OPENAI_API_KEY is not set', () => {
      process.env.OPENAI_BASE_URL = 'test-base';
      expect(validateAuthMethod(AuthType.OPENAI_COMPATIBLE)).toBe(
        'OPENAI_API_KEY environment variable not found. Add that to your environment and try again (no reload needed if using .env)!',
      );
    });

    it('should return an error message if OPENAI_BASE_URL is not set', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      expect(validateAuthMethod(AuthType.OPENAI_COMPATIBLE)).toBe(
        'OPENAI_BASE_URL environment variable not found. Add that to your environment and try again (no reload needed if using .env)!',
      );
    });
  });

  it('should return an error message for an invalid auth method', () => {
    expect(validateAuthMethod('invalid-method')).toBe(
      'Invalid auth method selected.',
    );
  });
});
