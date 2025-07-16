# VLM服务配置文档

## 环境变量配置

### OpenAI兼容VLM服务（优先使用）

```bash
# VLM专用配置（优先级更高）
OPENAI_VLM_API_KEY=your_vlm_api_key_here
OPENAI_VLM_BASE_URL=https://api.openai.com/v1
OPENAI_VLM_MODEL=gpt-4o

# 或者使用通用OpenAI配置作为备选
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
```

### 支持的VLM模型

- **OpenAI**: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4-vision-preview
- **兼容API**: 任何支持OpenAI Chat Completions API的VLM服务

### 配置优先级

1. **OpenAI VLM服务**（最高优先级）
   - 使用 `OPENAI_VLM_API_KEY` 或 `OPENAI_API_KEY`
   - 使用 `OPENAI_VLM_BASE_URL` 或 `OPENAI_BASE_URL`
   - 使用 `OPENAI_VLM_MODEL` 或默认 `gpt-4o`

2. **Gemini VLM服务**（回退选项）
   - 使用现有的Gemini配置
   - 模型: `gemini-2.0-flash-exp`

3. **无VLM服务**（最后回退）
   - 返回默认消息: "Image description not available - no VLM service configured"
   - 仅在首次调用时警告

## 使用示例

### 1. 使用OpenAI官方API

```bash
export OPENAI_VLM_API_KEY="sk-..."
export OPENAI_VLM_MODEL="gpt-4o"
```

### 2. 使用兼容的第三方服务

```bash
export OPENAI_VLM_API_KEY="your_key"
export OPENAI_VLM_BASE_URL="https://api.your-service.com/v1"
export OPENAI_VLM_MODEL="gpt-4-vision-preview"
```

### 3. 仅使用Gemini服务

```bash
# 不设置任何OpenAI VLM环境变量
# 系统会自动回退到Gemini服务
```

## 功能特性

### 1. 自动回退机制
- 优先尝试OpenAI VLM服务
- 失败时自动回退到Gemini服务
- 最终回退到默认消息

### 2. 错误处理
- 详细的错误日志记录
- 优雅的服务降级
- 避免重复警告消息

### 3. 环境变量灵活性
- 支持VLM专用配置
- 支持通用OpenAI配置
- 支持自定义Base URL和模型

## 实现架构

### 服务层次结构

```
CompositeVLMService
├── OpenAIVLMService (优先)
├── GeminiVLMService (回退)
└── Default Message (最终回退)
```

### 关键组件

1. **OpenAIVLMService**: 使用OpenAI Chat Completions API
2. **GeminiVLMService**: 使用Google Gemini API
3. **CompositeVLMService**: 组合服务，提供回退机制
4. **FileParserService**: 集成VLM服务进行文档解析

## 调试和监控

### 日志输出

```bash
# 成功初始化OpenAI服务
VLM: Using OpenAI-compatible service

# Gemini服务可用
VLM: Gemini service available as fallback

# 服务切换
OpenAI VLM service failed, trying fallback: [error message]

# 无服务可用（仅警告一次）
No VLM service available for image description. Please configure OPENAI_VLM_API_KEY or ensure Gemini service is available.
```

### 常见问题排查

1. **OpenAI API密钥错误**
   - 检查 `OPENAI_VLM_API_KEY` 是否正确
   - 确认API密钥权限

2. **Base URL连接失败**
   - 检查 `OPENAI_VLM_BASE_URL` 是否可访问
   - 确认网络连接

3. **模型不支持**
   - 检查 `OPENAI_VLM_MODEL` 是否支持视觉功能
   - 确认API服务提供商支持该模型

4. **Gemini服务问题**
   - 检查Gemini API配置
   - 确认内容生成器正常工作