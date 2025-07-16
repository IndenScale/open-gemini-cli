# VLMService Implementation

## Overview
The VLMService provides Vision-Language Model capabilities for image description in the Gemini CLI. It implements a composite pattern with multiple providers and automatic fallback mechanisms.

## Architecture

### Service Hierarchy
1. **VLMService Interface** (from fileParserService.ts)
   - Defines the contract: `describeImage(buffer: Buffer, mimeType: string): Promise<string>`

2. **OpenAIVLMService**
   - Primary implementation using OpenAI-compatible APIs
   - Supports custom endpoints via environment variables
   - Lazy initialization to avoid startup errors

3. **GeminiVLMService**
   - Fallback implementation using Google Gemini API
   - Integrated with the existing ContentGenerator

4. **CompositeVLMService**
   - Orchestrates multiple VLM providers
   - Implements automatic fallback logic
   - Provides graceful degradation

## Key Features

### 1. Environment Variable Configuration
```bash
# OpenAI-compatible service
OPENAI_VLM_API_KEY=your-api-key
OPENAI_VLM_BASE_URL=https://your-endpoint/v1  # Optional, defaults to OpenAI
OPENAI_VLM_MODEL=gpt-4o  # Optional, defaults to gpt-4o

# Fallback to standard OpenAI env vars
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
```

### 2. Image Processing
- Maximum image size: 20MB
- Automatic MIME type correction (image/jpg → image/jpeg)
- Base64 encoding for API transmission
- Low detail mode for token optimization

### 3. Error Handling
- Graceful fallback between services
- Specific error messages for common issues:
  - Image size limits
  - Token limits
  - API configuration errors
- Single warning for missing VLM configuration

### 4. Debug Logging
Comprehensive debug logging for troubleshooting:
```
[VLM Debug] Processing image: image/png, size: 1234567 bytes
[VLM Debug] Using model: gpt-4o
[VLM Debug] OpenAI response received: The image shows...
```

## Implementation Details

### OpenAIVLMService
```typescript
class OpenAIVLMService implements VLMService {
  private openai: OpenAI | null = null;
  private isInitialized = false;

  // Lazy initialization pattern
  private initialize(): void {
    if (this.isInitialized) return;
    // Configuration logic...
  }

  async describeImage(buffer: Buffer, mimeType: string): Promise<string> {
    this.initialize();
    // Image processing logic...
  }
}
```

### GeminiVLMService
```typescript
class GeminiVLMService implements VLMService {
  constructor(private contentGenerator: ContentGenerator) {}

  async describeImage(buffer: Buffer, mimeType: string): Promise<string> {
    // Uses Gemini's native vision capabilities
    const request: GenerateContentParameters = {
      model: 'gemini-2.0-flash-exp',
      contents: [{
        role: 'user',
        parts: [
          { text: 'Please describe this image...' },
          { inlineData: { mimeType, data: base64Image } }
        ]
      }]
    };
  }
}
```

### CompositeVLMService
```typescript
class CompositeVLMService implements VLMService {
  private openaiService: OpenAIVLMService | null = null;
  private geminiService: GeminiVLMService | null = null;

  async describeImage(buffer: Buffer, mimeType: string): Promise<string> {
    // Try OpenAI first
    if (this.openaiService) {
      try {
        return await this.openaiService.describeImage(buffer, mimeType);
      } catch (error) {
        // Fallback to Gemini
      }
    }
    
    // Try Gemini as fallback
    if (this.geminiService) {
      return await this.geminiService.describeImage(buffer, mimeType);
    }
    
    // No services available
    return 'Image description not available - no VLM service configured';
  }
}
```

## Usage in File Parser

The VLM service is integrated into the file parsing pipeline:

1. Binary files (images) are detected
2. Image buffer and MIME type are passed to VLM service
3. Description is returned as file content
4. Falls back to base64 representation if VLM unavailable

## Supported Image Formats
- PNG (image/png)
- JPEG (image/jpeg, image/jpg)
- GIF (image/gif)
- WebP (image/webp)
- BMP (image/bmp)
- SVG (image/svg+xml)

## Performance Considerations
- Lazy initialization prevents startup delays
- Service instances are cached after first use
- Failed services are marked to avoid repeated attempts
- Image size validation before API calls

## Future Enhancements
1. Image compression for large files
2. Batch processing for multiple images
3. Custom prompts for specific use cases
4. Additional VLM provider support
5. Local model integration options