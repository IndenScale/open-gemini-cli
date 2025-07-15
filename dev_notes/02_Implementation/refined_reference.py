#...


def safe_json_serialize(obj):
    """安全的 JSON 序列化，处理不能序列化的对象"""
    try:
        return json.loads(json.dumps(obj, default=str))
    except Exception:
        return str(obj)


@dataclass
class GeminiConfig:
    """Gemini 生成配置"""
    temperature: Optional[float] = None
    max_output_tokens: Optional[int] = None
    top_p: Optional[float] = None
    top_k: Optional[int] = None
    stop_sequences: Optional[List[str]] = None


class GeminiToOpenAIConverter:
    """Gemini 格式到 OpenAI 格式的转换器"""

    @staticmethod
    def convert_contents_to_messages(contents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """将 Gemini contents 转换为 OpenAI messages"""
        messages = []

        for i, content in enumerate(contents):
            role = content.get("role", "user")
            parts = content.get("parts", [])

            if role == "user":
                # 处理用户消息
                combined_text = ""
                tool_messages = []

                for part in parts:
                    if isinstance(part, dict):
                        if "text" in part:
                            combined_text += part["text"]
                        elif "functionResponse" in part:
                            # 转换函数响应为工具消息
                            func_response = part["functionResponse"]
                            tool_message = {
                                "role": "tool",
                                "tool_call_id": f"{func_response.get('name', 'unknown')}:0",
                                "content": json.dumps(func_response.get("response", {}))
                            }
                            tool_messages.append(tool_message)
                    elif isinstance(part, str):
                        combined_text += part

                # 添加用户消息
                if combined_text.strip():
                    messages.append({
                        "role": "user",
                        "content": combined_text.strip()
                    })

                # 添加工具消息
                messages.extend(tool_messages)

            elif role == "model":
                # 处理模型消息
                combined_text = ""
                tool_calls = []

                for part in parts:
                    if isinstance(part, dict):
                        if "text" in part:
                            combined_text += part["text"]
                        elif "functionCall" in part:
                            # 检查这是否是最后一个消息且包含 functionCall
                            is_last_message = (i == len(contents) - 1)

                            # 检查是否有对应的 functionResponse
                            has_response = False
                            for j in range(i + 1, len(contents)):
                                next_content = contents[j]
                                if next_content.get("role") == "user":
                                    for next_part in next_content.get("parts", []):
                                        if isinstance(next_part, dict) and "functionResponse" in next_part:
                                            # 检查 functionResponse 的名称是否匹配
                                            func_name = part["functionCall"].get("name")
                                            resp_name = next_part["functionResponse"].get("name")
                                            if func_name == resp_name:
                                                has_response = True
                                                break
                                if has_response:
                                    break

                            # 如果是最后一个消息且没有对应的响应，跳过这个 functionCall
                            # 这避免了 "tool_calls must be followed by tool messages" 错误
                            if is_last_message and not has_response:
                                continue

                            # 转换函数调用为工具调用
                            func_call = part["functionCall"]
                            # 使用正确的 ID 格式：function_name:index
                            tool_call = {
                                "id": f"{func_call.get('name', 'unknown')}:0",
                                "type": "function",
                                "function": {
                                    "name": func_call.get("name", ""),
                                    "arguments": json.dumps(func_call.get("args", {}))
                                }
                            }
                            tool_calls.append(tool_call)
                    elif isinstance(part, str):
                        combined_text += part

                # 只有在有内容或工具调用时才添加助手消息
                if combined_text.strip() or tool_calls:
                    assistant_message = {
                        "role": "assistant",
                        "content": combined_text.strip() if combined_text.strip() else None
                    }
                    if tool_calls:
                        assistant_message["tool_calls"] = tool_calls

                    messages.append(assistant_message)

        return messages

    @staticmethod
    def convert_config_to_openai_params(config: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """将 Gemini 配置转换为 OpenAI 参数"""
        if not config:
            return {}

        openai_params = {}

        # 参数映射
        if "temperature" in config:
            openai_params["temperature"] = config["temperature"]
        if "maxOutputTokens" in config:
            openai_params["max_tokens"] = config["maxOutputTokens"]
        if "topP" in config:
            openai_params["top_p"] = config["topP"]
        if "stopSequences" in config:
            openai_params["stop"] = config["stopSequences"]

        return openai_params

    @staticmethod
    def convert_tools_to_openai(tools: Optional[List[Dict[str, Any]]]) -> Optional[List[Dict[str, Any]]]:
        """转换工具定义"""
        if not tools:
            return None

        openai_tools = []
        for tool in tools:
            if "functionDeclarations" in tool:
                for func_decl in tool["functionDeclarations"]:
                    openai_tool = {
                        "type": "function",
                        "function": {
                            "name": func_decl.get("name", ""),
                            "description": func_decl.get("description", ""),
                            "parameters": func_decl.get("parameters", {})
                        }
                    }
                    openai_tools.append(openai_tool)

        return openai_tools if openai_tools else None


class OpenAIToGeminiConverter:
    """OpenAI 格式到 Gemini 格式的转换器"""

    @staticmethod
    def clean_markdown_json(content: str) -> str:
        """清理 markdown 格式的 JSON 代码块，提取纯 JSON 内容"""
        import re

        # 匹配 ```json\n...内容...\n``` 格式
        json_pattern = r'^```json\s*\n(.*?)\n```$'
        match = re.match(json_pattern, content.strip(), re.DOTALL)

        if match:
            # 提取 JSON 内容
            json_content = match.group(1)
            return json_content

        # 如果不匹配模式，返回原内容
        return content

    @staticmethod
    def convert_response_to_gemini(response: Any) -> Dict[str, Any]:
        """将 OpenAI 响应转换为 Gemini 格式"""
        choice = response.choices[0]
        message = choice.message

        # 构建 parts
        parts = []

        # 添加文本内容
        if message.content:
            # 清理 markdown 格式的 JSON 代码块
            cleaned_content = OpenAIToGeminiConverter.clean_markdown_json(message.content)
            parts.append({"text": cleaned_content})

        # 添加工具调用
        if hasattr(message, 'tool_calls') and message.tool_calls:
            for tool_call in message.tool_calls:
                function_call_part = {
                    "functionCall": {
                        "name": tool_call.function.name,
                        "args": json.loads(tool_call.function.arguments)
                    }
                }
                parts.append(function_call_part)

        # 映射完成原因
        finish_reason_mapping = {
            "stop": "STOP",
            "length": "MAX_TOKENS",
            "content_filter": "SAFETY",
            "tool_calls": "STOP",
            "function_call": "STOP"
        }
        finish_reason = finish_reason_mapping.get(choice.finish_reason, "STOP")

        # 构建响应
        gemini_response = {
            "candidates": [{
                "content": {
                    "parts": parts,
                    "role": "model"
                },
                "finishReason": finish_reason,
                "index": 0,
                "safetyRatings": None
            }],
            "promptFeedback": {
                "safetyRatings": None
            }
        }

        # 添加使用信息
        if hasattr(response, 'usage') and response.usage:
            usage_metadata = {
                "promptTokenCount": response.usage.prompt_tokens,
                "candidatesTokenCount": response.usage.completion_tokens,
                "totalTokenCount": response.usage.total_tokens
            }

            # 添加详细的 token 信息
            if hasattr(response.usage, 'prompt_tokens_details'):
                usage_metadata["promptTokensDetails"] = [{
                    "modality": "TEXT",
                    "tokenCount": response.usage.prompt_tokens
                }]
            else:
                # 如果没有详细信息，使用默认格式
                usage_metadata["promptTokensDetails"] = [{
                    "modality": "TEXT",
                    "tokenCount": response.usage.prompt_tokens
                }]

            # 添加思考 token 计数（如果有的话，这是 Gemini 特有的）
            # OpenAI 没有这个字段，我们暂时设为 0 或不包含
            # usage_metadata["thoughtsTokenCount"] = 0

            gemini_response["usageMetadata"] = usage_metadata

        return gemini_response

    @staticmethod
    def convert_streaming_chunk_to_gemini(chunk: Any, accumulated_tool_calls: Dict) -> Optional[Dict[str, Any]]:
        """转换流式响应块为 Gemini 格式"""
        if not chunk.choices:
            return None

        choice = chunk.choices[0]
        if not choice.delta:
            return None

        delta = choice.delta
        parts = []

        # 处理文本内容
        if delta.content:
            # 对于流式响应，暂时不处理 markdown 清理，因为内容是分块的
            # markdown 清理将在最终合并时处理
            parts.append({"text": delta.content})

        # 处理工具调用（需要累积）
        if hasattr(delta, 'tool_calls') and delta.tool_calls:
            for tool_call in delta.tool_calls:
                # 使用 index 作为主键，因为流式响应中 id 经常为 None
                tool_call_index = tool_call.index if tool_call.index is not None else 0
                tool_call_key = f"tool_{tool_call_index}"

                # 初始化累积状态
                if tool_call_key not in accumulated_tool_calls:
                    accumulated_tool_calls[tool_call_key] = {
                        "id": "",
                        "name": "",
                        "arguments": ""
                    }

                # 累积工具调用 ID（只在第一次出现时设置）
                if tool_call.id and not accumulated_tool_calls[tool_call_key]["id"]:
                    accumulated_tool_calls[tool_call_key]["id"] = tool_call.id

                # 累积函数名（只在第一次出现时设置）
                if tool_call.function and tool_call.function.name and not accumulated_tool_calls[tool_call_key]["name"]:
                    accumulated_tool_calls[tool_call_key]["name"] = tool_call.function.name

                # 累积函数参数
                if tool_call.function and tool_call.function.arguments:
                    accumulated_tool_calls[tool_call_key]["arguments"] += tool_call.function.arguments

                # 尝试解析完整的 JSON
                try:
                    args_str = accumulated_tool_calls[tool_call_key]["arguments"]
                    name = accumulated_tool_calls[tool_call_key]["name"]

                    if args_str and name:
                        parsed_args = json.loads(args_str)
                        # JSON 完整，创建函数调用部分
                        function_call_part = {
                            "functionCall": {
                                "name": name,
                                "args": parsed_args
                            }
                        }
                        parts.append(function_call_part)
                        # 清理已完成的工具调用
                        del accumulated_tool_calls[tool_call_key]
                except json.JSONDecodeError:
                    # JSON 不完整，继续累积
                    pass

        if not parts and not choice.finish_reason:
            return None

        # 映射完成原因
        finish_reason_mapping = {
            "stop": "STOP",
            "length": "MAX_TOKENS",
            "content_filter": "SAFETY",
            "tool_calls": "STOP"
        }

        return {
            "candidates": [{
                "content": {"parts": parts, "role": "model"},
                "finishReason": finish_reason_mapping.get(choice.finish_reason) if choice.finish_reason else None,
                "index": 0,
                "safetyRatings": []
            }]
        }


class GeminiProxyService:
    """Gemini API 代理服务"""

    def __init__(self, openai_api_key: str, openai_base_url: str = "https://api.openai.com/v1"):
        self.client = AsyncOpenAI(
            api_key=openai_api_key,
            base_url=openai_base_url
        )
        self.converter_to_openai = GeminiToOpenAIConverter()
        self.converter_to_gemini = OpenAIToGeminiConverter()

    def map_gemini_model_to_openai(self, gemini_model: str) -> str:
        """将 Gemini 模型名称映射到 OpenAI 模型名称"""
        mapped_model = MODEL_MAPPING.get(gemini_model, DEFAULT_OPENAI_MODEL)
        logger.info(f"模型映射: {gemini_model} -> {mapped_model}")
        return mapped_model

    async def generate_content(self, request_data: Dict[str, Any], request_id: str = None, endpoint: str = "") -> Dict[str, Any]:
        """处理 generateContent 请求"""
        if request_id is None:
            request_id = str(uuid.uuid4())

        try:
            # 记录原始 Gemini 请求
            log_request_response(
                request_id,
                "1_GEMINI_REQUEST",
                safe_json_serialize(request_data),
                "用户发送的 Gemini 格式请求",
                endpoint
            )

            # 提取参数
            gemini_model = request_data.get("model", "gemini-1.5-pro")
            contents = request_data.get("contents", [])
            system_instruction = request_data.get("systemInstruction")
            generation_config = request_data.get("generationConfig")
            tools = request_data.get("tools")

            # 映射 Gemini 模型到 OpenAI 模型
            openai_model = self.map_gemini_model_to_openai(gemini_model)

            # 转换为 OpenAI 格式
            messages = self.converter_to_openai.convert_contents_to_messages(contents)

            # 处理系统指令：如果有 systemInstruction，添加为第一个 system message
            if system_instruction and system_instruction.get("parts"):
                system_text = ""
                for part in system_instruction["parts"]:
                    if "text" in part:
                        system_text += part["text"]

                if system_text.strip():
                    # 在消息列表开头插入 system message
                    messages.insert(0, {
                        "role": "system",
                        "content": system_text.strip()
                    })
            openai_params = self.converter_to_openai.convert_config_to_openai_params(generation_config)
            openai_tools = self.converter_to_openai.convert_tools_to_openai(tools)

            # 构建 OpenAI 请求
            completion_params = {
                "model": openai_model,  # 使用映射后的模型
                "messages": messages,
                **openai_params
            }

            if openai_tools:
                completion_params["tools"] = openai_tools
                completion_params["tool_choice"] = "auto"

            # 记录转换后的 OpenAI 请求
            log_request_response(
                request_id,
                "2_OPENAI_REQUEST",
                safe_json_serialize(completion_params),
                f"转换为 OpenAI 格式的请求，模型映射: {gemini_model} -> {openai_model}",
                endpoint
            )

            # 调用 OpenAI API
            response = await self.client.chat.completions.create(**completion_params)

            # 记录 OpenAI 原始响应
            log_request_response(
                request_id,
                "3_OPENAI_RESPONSE",
                safe_json_serialize(response),
                "OpenAI API 返回的原始响应",
                endpoint
            )

            # 转换响应为 Gemini 格式
            gemini_response = self.converter_to_gemini.convert_response_to_gemini(response)

            # 记录最终的 Gemini 响应
            log_request_response(
                request_id,
                "4_GEMINI_RESPONSE",
                safe_json_serialize(gemini_response),
                "返回给用户的 Gemini 格式响应",
                endpoint
            )

            return gemini_response

        except Exception as e:
            # 记录错误
            log_request_response(
                request_id,
                "ERROR",
                {"error": str(e), "type": type(e).__name__},
                "请求处理过程中发生错误",
                endpoint
            )
            logger.error(f"Error in generate_content: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    async def stream_generate_content(self, request_data: Dict[str, Any], request_id: str = None, endpoint: str = "") -> AsyncGenerator[str, None]:
        """处理流式 generateContent 请求"""
        if request_id is None:
            request_id = str(uuid.uuid4())

        try:
            # 记录原始 Gemini 流式请求
            log_request_response(
                request_id,
                "1_GEMINI_STREAM_REQUEST",
                safe_json_serialize(request_data),
                "用户发送的 Gemini 格式流式请求",
                endpoint
            )

            # 提取参数
            gemini_model = request_data.get("model", "gemini-1.5-pro")
            contents = request_data.get("contents", [])
            system_instruction = request_data.get("systemInstruction")
            generation_config = request_data.get("generationConfig")
            tools = request_data.get("tools")

            # 映射 Gemini 模型到 OpenAI 模型
            openai_model = self.map_gemini_model_to_openai(gemini_model)

            # 转换为 OpenAI 格式
            messages = self.converter_to_openai.convert_contents_to_messages(contents)

            # 处理系统指令：如果有 systemInstruction，添加为第一个 system message
            if system_instruction and system_instruction.get("parts"):
                system_text = ""
                for part in system_instruction["parts"]:
                    if "text" in part:
                        system_text += part["text"]

                if system_text.strip():
                    # 在消息列表开头插入 system message
                    messages.insert(0, {
                        "role": "system",
                        "content": system_text.strip()
                    })
            openai_params = self.converter_to_openai.convert_config_to_openai_params(generation_config)
            openai_tools = self.converter_to_openai.convert_tools_to_openai(tools)

            # 构建 OpenAI 请求
            completion_params = {
                "model": openai_model,  # 使用映射后的模型
                "messages": messages,
                "stream": True,
                **openai_params
            }

            if openai_tools:
                completion_params["tools"] = openai_tools
                completion_params["tool_choice"] = "auto"

            # 记录转换后的 OpenAI 流式请求
            log_request_response(
                request_id,
                "2_OPENAI_STREAM_REQUEST",
                safe_json_serialize(completion_params),
                f"转换为 OpenAI 格式的流式请求，模型映射: {gemini_model} -> {openai_model}",
                endpoint
            )

            # 调用 OpenAI 流式 API
            stream = await self.client.chat.completions.create(**completion_params)

            # 累积工具调用状态和响应内容
            accumulated_tool_calls = {}
            all_chunks = []  # 记录所有流式块

            async for chunk in stream:
                # 记录 OpenAI 流式块（采样记录，避免日志过多）
                if len(all_chunks) < 5 or len(all_chunks) % 10 == 0:
                    log_request_response(
                        request_id,
                        f"3_OPENAI_STREAM_CHUNK_{len(all_chunks)}",
                        safe_json_serialize(chunk),
                        f"OpenAI 流式响应块 #{len(all_chunks)}",
                        endpoint
                    )

                all_chunks.append(chunk)

                gemini_chunk = self.converter_to_gemini.convert_streaming_chunk_to_gemini(
                    chunk, accumulated_tool_calls
                )

                if gemini_chunk:
                    # 记录转换后的 Gemini 流式块（采样记录）
                    if len(all_chunks) < 5 or len(all_chunks) % 10 == 0:
                        log_request_response(
                            request_id,
                            f"4_GEMINI_STREAM_CHUNK_{len(all_chunks)}",
                            safe_json_serialize(gemini_chunk),
                            f"转换后的 Gemini 流式响应块 #{len(all_chunks)}",
                            endpoint
                        )

                    chunk_data = json.dumps(gemini_chunk, ensure_ascii=False)
                    yield f"data: {chunk_data}\n\n"

            # 处理流式结束时剩余的工具调用
            if accumulated_tool_calls:
                for tool_data in accumulated_tool_calls.values():
                    name = tool_data.get("name")
                    args_str = tool_data.get("arguments")

                    if name and args_str:
                        try:
                            parsed_args = json.loads(args_str)
                            # 创建最终的函数调用响应
                            final_gemini_chunk = {
                                "candidates": [{
                                    "content": {
                                        "parts": [{
                                            "functionCall": {
                                                "name": name,
                                                "args": parsed_args
                                            }
                                        }],
                                        "role": "model"
                                    },
                                    "finishReason": "STOP",
                                    "index": 0,
                                    "safetyRatings": []
                                }]
                            }

                            # 记录最终的工具调用块
                            log_request_response(
                                request_id,
                                f"4_GEMINI_STREAM_CHUNK_FINAL",
                                safe_json_serialize(final_gemini_chunk),
                                f"最终的 Gemini 工具调用响应块",
                                endpoint
                            )

                            chunk_data = json.dumps(final_gemini_chunk, ensure_ascii=False)
                            yield f"data: {chunk_data}\n\n"
                        except json.JSONDecodeError:
                            # 参数格式错误，记录但继续
                            log_request_response(
                                request_id,
                                "ERROR",
                                {"tool_data": tool_data, "error": "JSON 解析失败"},
                                "工具调用参数解析失败",
                                endpoint
                            )

            # 记录完整的流式响应总结
            log_request_response(
                request_id,
                "5_STREAM_SUMMARY",
                {"total_chunks": len(all_chunks), "accumulated_tool_calls": accumulated_tool_calls},
                f"流式响应完成，总共 {len(all_chunks)} 个块",
                endpoint
            )

        except Exception as e:
            # 记录错误
            log_request_response(
                request_id,
                "STREAM_ERROR",
                {"error": str(e), "type": type(e).__name__},
                "流式请求处理过程中发生错误",
                endpoint
            )
            logger.error(f"Error in stream_generate_content: {e}")
            error_response = {
                "error": {
                    "message": str(e),
                    "type": "internal_error"
                }
            }
            yield f"data: {json.dumps(error_response, ensure_ascii=False)}\n\n"


# ......
