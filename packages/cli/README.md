# Open Gemini CLI

Open Gemini CLI is a fork of the Google Gemini CLI that empowers you with the freedom to connect and use any OpenAI-compatible API as your Agent reasoning engine.
We believe that a powerful Agent tool should not be locked into a single ecosystem. By opening up backend choices, we hope to inspire more innovation, protect user privacy, and foster a more open and collaborative AI Agent ecosystem.

## 💡 Why Choose Open Gemini CLI?

With Open Gemini CLI, you can:

- **Freedom to choose MaaS providers**: No longer limited to a single cloud vendor, you can run your Agent on any platform that provides OpenAI-compatible APIs (such as Azure, Groq, Together AI, and numerous open-source model frameworks).
- **Use locally hosted models for privacy protection**: By connecting to locally running LLMs (such as through Ollama, vLLM, LlamaEdge, etc.), you can ensure that code and data remain completely on your device, achieving the highest level of privacy and security.
- **Mix multiple models to balance cost and efficiency**: You can configure different model providers for different tasks (such as general reasoning, code generation, visual understanding), achieving the optimal combination of cost and performance.
- **Evaluate and compare models in Agentic tasks**: In the same complex workflows, easily switch and compare the performance of different models (such as GPT-4o, Llama3, Mixtral, Qwen2) to find the "brain" that best suits your tasks.

## 🚀 Quick Start

1. **Install prerequisites**: Ensure you have Node.js version 20 or higher installed.
2. **Run directly via npx (recommended)**: `npx https://github.com/IndenScale/open-gemini-cli`
3. **Or install globally**: `npm install -g @indenscale/open-gemini-cli`
4. **Configuration**: On first run, the CLI will guide you through interactive configuration. When asked about authentication method, select the newly added "Use an OpenAI Compatible API" option.

You can also configure quickly through environment variables:

### Global Configuration (Recommended)

This is the simplest way, directing all requests to the same OpenAI-compatible endpoint.

```bash
# Your API key (required)
export OPENAI_API_KEY="your-moonshot-api-key"
# Your API endpoint address (required, e.g., https://api.moonshot.cn/v1)
export OPENAI_BASE_URL="YOUR_BASE_URL"
# The model name you want to use (optional, defaults to gpt-4o)
export OPENAI_MODEL="kimi-k2-0711-preview"
```

### Fine-grained Configuration (Advanced)(Not Implemented Yet)

You can specify different model providers for different types of tasks to achieve ultimate optimization of cost and performance.

```bash
# Main LLM reasoning using a powerful model
export OPENAI_LLM_KEY="your-moonshot-api-key"
export OPENAI_LLM_BASE="https://api.moonshot.cn/v1"
export OPENAI_LLM_MODEL="kimi-k2-0711-preview"

# Vision understanding (VLM) using another model
export OPENAI_VLM_KEY="sk-..."
export OPENAI_VLM_BASE="https://api.openai.com/v1"
export OPENAI_VLM_MODEL="gpt-4o"

# Fast, cheap tasks (like conversation history compression) using Flash models
export OPENAI_FLASH_KEY="sk-..."
export OPENAI_FLASH_BASE="https://api.together.xyz/v1"
export OPENAI_FLASH_MODEL="mistralai/Mixtral-8x7B-Instruct-v0.1"
```

## 🛠️ Implementation Approach

For transparency, we briefly explain the compatibility layer implementation approach of open-gemini-cli:

We introduce an adapter layer (API Adaptor) that acts as a "translator" between the core Agent logic and the underlying model APIs.

- **Request transformation**: When you issue instructions, the APIAdaptor converts Gemini's internal message and tool call format (Content[]) to OpenAI-compatible messages array format.
- **Response transformation**: When OpenAI-compatible APIs return data in streaming (delta) format, the APIAdaptor reassembles these incremental data chunks into structurally complete GenerateContentResponse events expected by the upper-level gemini-cli logic.

This design ensures that gemini-cli's powerful Agent scheduling, tool execution, and multi-turn interaction logic can remain unchanged while seamlessly running on different reasoning backends.

## 🔮 Future Plans

We are actively enhancing file processing tools (read_file, read_many_files). Since many OpenAI-compatible models do not have native, integrated multimodal capabilities like Gemini, we will introduce a file parsing and understanding layer. This will allow the CLI to automatically convert image, PDF, and other file content into high-quality text descriptions before submitting to the core LLM, thus achieving powerful multimodal file interaction capabilities on any model.

## ❤️ Welcome Contributions

open-gemini-cli is a community-driven project. We welcome contributions of any form, whether it's submitting bug reports, proposing feature suggestions, or directly contributing code. If you share the vision of this project, please join us in building a more open, free, and powerful AI Agent tool together!
