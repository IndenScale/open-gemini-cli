# VLM服务使用示例

## 修复后的VLM服务架构

### 1. 问题修复总结

#### 原始问题：
- VLM服务实现在错误的文件中
- 没有使用环境变量配置
- 没有优先使用OpenAI兼容服务
- 缺少合适的回退机制

#### 修复实现：
- 正确实现了三层服务架构
- 添加了环境变量配置支持
- 实现了OpenAI优先的回退机制
- 添加了适当的错误处理和警告

### 2. 新的服务架构

```
CompositeVLMService (主服务)
├── OpenAIVLMService (优先级1)
│   ├── 环境变量: OPENAI_VLM_API_KEY
│   ├── 环境变量: OPENAI_VLM_BASE_URL  
│   └── 环境变量: OPENAI_VLM_MODEL
├── GeminiVLMService (优先级2)
│   └── 使用现有的ContentGenerator
└── Default Message (优先级3)
    └── 返回默认消息
```

### 3. 环境变量配置

```bash
# 推荐配置：使用OpenAI兼容服务
export OPENAI_VLM_API_KEY="sk-your-api-key"
export OPENAI_VLM_BASE_URL="https://api.openai.com/v1"
export OPENAI_VLM_MODEL="gpt-4o"

# 或者使用第三方兼容服务
export OPENAI_VLM_API_KEY="your-key"
export OPENAI_VLM_BASE_URL="https://api.deepseek.com/v1"
export OPENAI_VLM_MODEL="deepseek-vl"
```

### 4. 使用流程

#### 步骤1: 配置环境变量
```bash
# 设置OpenAI VLM服务
export OPENAI_VLM_API_KEY="your-api-key"
export OPENAI_VLM_MODEL="gpt-4o"
```

#### 步骤2: 使用Office文件解析
```bash
# 解析包含图片的Word文档
./gemini-cli --file document.docx "解析这个文档"

# 解析Excel表格
./gemini-cli --file spreadsheet.xlsx "分析这个表格"

# 解析PowerPoint文档
./gemini-cli --file presentation.pptx "总结这个演示文稿"
```

#### 步骤3: 查看日志输出
```bash
# 成功使用OpenAI服务
VLM: Using OpenAI-compatible service

# 回退到Gemini服务
OpenAI VLM service failed, trying fallback: Invalid API key
VLM: Gemini service available as fallback

# 无服务可用
No VLM service available for image description. Please configure OPENAI_VLM_API_KEY or ensure Gemini service is available.
```

### 5. 服务特性

#### A. OpenAI兼容服务优势
- 支持最新的VLM模型
- 更好的图像理解能力
- 支持多种第三方服务
- 统一的API接口

#### B. 回退机制
- 自动检测服务可用性
- 优雅的错误处理
- 避免重复警告
- 保证服务连续性

#### C. 环境变量灵活性
- 支持专用VLM配置
- 支持通用OpenAI配置
- 支持自定义Base URL
- 支持模型选择

### 6. 实际效果演示

#### 输入：包含图片的Word文档
```
document.docx:
- 文本内容：产品介绍
- 图片：产品截图
- 表格：价格对比
```

#### 输出：解析后的Markdown
```markdown
# document.docx

## 产品介绍

这是我们的新产品...

[Image: A screenshot showing the product interface with a clean design. The main dashboard displays various metrics and charts. There's a navigation menu on the left side with options like Dashboard, Analytics, and Settings. The color scheme is predominantly blue and white.]

## 价格对比

| 套餐 | 价格 | 功能 |
|------|------|------|
| 基础版 | $10/月 | 基础功能 |
| 专业版 | $20/月 | 高级功能 |
```

### 7. 故障排除

#### 常见问题1：OpenAI API密钥错误
```bash
# 错误信息
OpenAI VLM service error: Invalid API key

# 解决方案
export OPENAI_VLM_API_KEY="sk-correct-api-key"
```

#### 常见问题2：模型不支持视觉
```bash
# 错误信息
Model does not support vision capabilities

# 解决方案
export OPENAI_VLM_MODEL="gpt-4o"
```

#### 常见问题3：Base URL不可访问
```bash
# 错误信息
Network error: connect ECONNREFUSED

# 解决方案
export OPENAI_VLM_BASE_URL="https://api.openai.com/v1"
```

### 8. 性能优化

#### A. 服务缓存
- 初始化时检测服务可用性
- 避免重复的服务初始化
- 智能的错误状态缓存

#### B. 错误处理
- 快速失败机制
- 详细的错误日志
- 优雅的降级处理

#### C. 资源管理
- 按需初始化服务
- 合理的超时设置
- 内存使用优化

### 9. 扩展性

#### A. 新增VLM服务
1. 实现VLMService接口
2. 添加到CompositeVLMService
3. 配置环境变量

#### B. 自定义回退逻辑
1. 修改CompositeVLMService
2. 添加新的优先级规则
3. 实现自定义错误处理

#### C. 监控和指标
1. 添加服务调用计数
2. 记录响应时间
3. 监控错误率

这个新的VLM服务实现完全解决了原始问题，提供了更好的用户体验和更强的扩展性。