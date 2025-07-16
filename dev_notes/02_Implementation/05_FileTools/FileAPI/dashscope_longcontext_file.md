快速开始
前提条件
已获取API Key，并配置API Key到环境变量。

已安装OpenAI SDK。

文档上传方式选择
在选择文档上传方式时，请考虑以下因素：

通过文件ID 上传

推荐：适合需要频繁引用和管理的文档。可以有效减少文本输入错误，操作简便。

文件格式支持文本文件（ TXT、DOCX、PDF、XLSX、EPUB、MOBI、MD、CSV、JSON），图片文件（BMP、PNG、JPG/JPEG、GIF 以及PDF扫描件）。图片格式文件大小限制为20M，其他格式文件大小限制为 150MB。单个阿里云账号最多可上传 1 万个文件，总文件大小不得超过 100GB。当任一条件超出限制时，需删除部分文件以满足要求后再重新尝试上传，详情请参见OpenAI文件接口兼容。
通过纯文本上传

适用场景：适合小规模文档或临时内容。如果文档较短且不需要长期存储，可以选择此方式。受限于API调用请求体大小，如果您的文本内容长度超过100万Token，请通过文件ID传入。

通过 JSON 字符串上传

适用场景：适合需要传递复杂数据结构的情况。如果您的文档包含多层次信息，使用 JSON 字符串可以确保数据的完整性。

请根据您的具体需求和文档特性选择最合适的上传方式。我们建议优先考虑 文件ID 上传，以获得最佳体验。

通过文件ID传入文档信息
您可以通过OpenAI兼容接口上传文档，并将返回的文件ID输入到System Message中，使得模型在回复时参考文档信息。

简单示例
Qwen-Long模型可以基于您上传的文档进行回复。此处以阿里云百炼系列手机产品介绍.docx作为示例文件。

将文件通过OpenAI兼容接口上传到阿里云百炼平台，保存至平台安全存储空间后获取文件ID。有关文档上传接口的详细参数解释及调用方式，请参考API文档页面进行了解。

PythonJavacurl

import os
from pathlib import Path
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("DASHSCOPE_API_KEY"),  # 如果您没有配置环境变量，请在此处替换您的API-KEY
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",  # 填写DashScope服务base_url
)

file_object = client.files.create(file=Path("阿里云百炼系列手机产品介绍.docx"), purpose="file-extract")
print(file_object.id)
运行以上代码，您可以得到本次上传文件对应的文件ID。

文件ID目前仅能用于Qwen-Long模型以及Batch接口。
将文件ID传入System Message中且数量不超过 100 个，并在User Message中输入问题。

在通过 system message 提供文档信息时，建议同时设置一个正常role-play的system message，如默认的 “You are a helpful assistant.”，角色设定会对文档的处理效果产生影响，因此建议在消息中明确设定自己的角色。
PythonJavacurl

import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("DASHSCOPE_API_KEY"),  # 如果您没有配置环境变量，请在此处替换您的API-KEY
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",  # 填写DashScope服务base_url
)
try:
    # 初始化messages列表
    completion = client.chat.completions.create(
        model="qwen-long",
        messages=[
            {'role': 'system', 'content': 'You are a helpful assistant.'},
            # 请将 'file-fe-xxx'替换为您实际对话场景所使用的 fileid。
            {'role': 'system', 'content': f'fileid://file-fe-xxx'},
            {'role': 'user', 'content': '这篇文章讲了什么?'}
        ],
        # 所有代码示例均采用流式输出，以清晰和直观地展示模型输出过程。如果您希望查看非流式输出的案例，请参见https://help.aliyun.com/zh/model-studio/text-generation
        stream=True,
        stream_options={"include_usage": True}
    )

    full_content = ""
    for chunk in completion:
        if chunk.choices and chunk.choices[0].delta.content:
            # 拼接输出内容
            full_content += chunk.choices[0].delta.content
            print(chunk.model_dump())

    print(full_content)

except BadRequestError as e:
    print(f"错误信息：{e}")
    print("请参考文档：https://help.aliyun.com/zh/model-studio/developer-reference/error-code")
通过配置stream及stream_options参数，Qwen-Long模型会流式输出回复，并在最后返回的对象中通过usage字段展示Token使用情况。

本文中的所有代码示例均采用流式输出，以清晰和直观地展示模型输出过程。如果您希望查看非流式输出的案例，请参见非流式输出案例。
PythonJavacurl

{'id':'chatcmpl-565151e8-7b41-9a78-ae88-472edbad8c47','choices':[{'delta':{'content':'','function_call':null,'role':'assistant','tool_calls':null},'finish_reason':null,'index':0,'logprobs':null}],'created':1726023099,'model':'qwen-long','object':'chat.completion.chunk','service_tier':null,'system_fingerprint':null,'usage':null}
{'id':'chatcmpl-565151e8-7b41-9a78-ae88-472edbad8c47','choices':[{'delta':{'content':'这篇文章','function_call':null,'role':null,'tool_calls':null},'finish_reason':null,'index':0,'logprobs':null}],'created':1726023099,'model':'qwen-long','object':'chat.completion.chunk','service_tier':null,'system_fingerprint':null,'usage':null}
{'id':'chatcmpl-565151e8-7b41-9a78-ae88-472edbad8c47','choices':[{'delta':{'content':'介绍了','function_call':null,'role':null,'tool_calls':null},'finish_reason':null,'index':0,'logprobs':null}],'created':1726023099,'model':'qwen-long','object':'chat.completion.chunk','service_tier':null,'system_fingerprint':null,'usage':null}
{'id':'chatcmpl-565151e8-7b41-9a78-ae88-472edbad8c47','choices':[{'delta':{'content':'百','function_call':null,'role':null,'tool_calls':null},'finish_reason':null,'index':0,'logprobs':null}],'created':1726023099,'model':'qwen-long','object':'chat.completion.chunk','service_tier':null,'system_fingerprint':null,'usage':null}
......
{'id':'chatcmpl-565151e8-7b41-9a78-ae88-472edbad8c47','choices':[{'delta':{'content':'满足不同的使用需求','function_call':null,'role':null,'tool_calls':null},'finish_reason':null,'index':0,'logprobs':null}],'created':1726023099,'model':'qwen-long','object':'chat.completion.chunk','service_tier':null,'system_fingerprint':null,'usage':null}
{'id':'chatcmpl-565151e8-7b41-9a78-ae88-472edbad8c47','choices':[{'delta':{'content':'。','function_call':null,'role':null,'tool_calls':null},'finish_reason':null,'index':0,'logprobs':null}],'created':1726023099,'model':'qwen-long','object':'chat.completion.chunk','service_tier':null,'system_fingerprint':null,'usage':null}
{'id':'chatcmpl-565151e8-7b41-9a78-ae88-472edbad8c47','choices':[{'delta':{'content':'','function_call':null,'role':null,'tool_calls':null},'finish_reason':'stop','index':0,'logprobs':null}],'created':1726023099,'model':'qwen-long','object':'chat.completion.chunk','service_tier':null,'system_fingerprint':null,'usage':null}
{'id':'chatcmpl-565151e8-7b41-9a78-ae88-472edbad8c47','choices':[],'created':1726023099,'model':'qwen-long','object':'chat.completion.chunk','service_tier':null,'system_fingerprint':null,'usage':{'completion_tokens':93,'prompt_tokens':5395,'total_tokens':5488}}
{'这篇文章是关于阿里云百炼系列手机的产品介绍，详细描述了六款不同型号的手机特点和卖点：.....每款手机都有其独特的特点和目标用户群体，旨在满足不同消费者的需求。'}
除了传入单个文件ID外，您还可以通过传入多个文件ID来向模型传入多个文档，或在对话过程中追加文件ID使模型能够参考新的文档信息。

传入多文档
您可以在一条System Message中传入多个文件ID，在一次请求中处理多个文档。使用方式请参考示例代码。

示例代码

PythonJavacurl

import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("DASHSCOPE_API_KEY"),  # 如果您没有配置环境变量，请在此处替换您的API-KEY
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",  # 填写DashScope服务base_url
)
try:
    # 初始化messages列表
    completion = client.chat.completions.create(
        model="qwen-long",
        messages=[
            {'role': 'system', 'content': 'You are a helpful assistant.'},
            # 请将 'file-fe-xxx1' 和 'file-fe-xxx2' 替换为您实际对话场景所使用的 fileid。
            {'role': 'system', 'content': f"fileid://file-fe-xxx1,fileid://file-fe-xxx2"},
            {'role': 'user', 'content': '这几篇文章讲了什么？'}
        ],
        # 所有代码示例均采用流式输出，以清晰和直观地展示模型输出过程。如果您希望查看非流式输出的案例，请参见https://help.aliyun.com/zh/model-studio/text-generation
        stream=True,
        stream_options={"include_usage": True}
    )

    full_content = ""
    for chunk in completion:
        if chunk.choices and chunk.choices[0].delta.content:
            # 拼接输出内容
            full_content += chunk.choices[0].delta.content
            print(chunk.model_dump())

    print({full_content})

except BadRequestError as e:
    print(f"错误信息：{e}")
    print("请参考文档：https://help.aliyun.com/zh/model-studio/developer-reference/error-code")
追加文档
在您与模型的交互过程中，可能需要补充新的文档信息。您可以在Messages 数组中添加新的文件ID到System Message中来实现这一效果。

PythonJavacurl

import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("DASHSCOPE_API_KEY"),  # 如果您没有配置环境变量，请在此处替换您的API-KEY
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",  # 填写DashScope服务base_url
)
# 初始化messages列表
messages = [
    {'role': 'system', 'content': 'You are a helpful assistant.'},
    # 请将 'file-fe-xxx1' 替换为您实际对话场景所使用的 fileid。
    {'role': 'system', 'content': f'fileid://file-fe-xxx1'},
    {'role': 'user', 'content': '这篇文章讲了什么？'}
]

try:
    # 第一轮响应
    completion_1 = client.chat.completions.create(
        model="qwen-long",
        messages=messages,
        stream=False
    )
    # 打印出第一轮响应
    # 如果需要流式输出第一轮的响应，需要将stream设置为True，并拼接每一段输出内容，在构造assistant_message的content时传入拼接后的字符
    print(f"第一轮响应：{completion_1.choices[0].message.model_dump()}")
except BadRequestError as e:
    print(f"错误信息：{e}")
    print("请参考文档：https://help.aliyun.com/zh/model-studio/developer-reference/error-code")

# 构造assistant_message
assistant_message = {
    "role": "assistant",
    "content": completion_1.choices[0].message.content}

# 将assistant_message添加到messages中
messages.append(assistant_message)

# 将追加文档的fileid添加到messages中
# 请将 'file-fe-xxx2' 替换为您实际对话场景所使用的 fileid。
system_message = {'role': 'system', 'content': f'fileid://file-fe-xxx2'}
messages.append(system_message)

# 添加用户问题
messages.append({'role': 'user', 'content': '这两篇文章讨论的方法有什么异同点？'})

# 追加文档后的响应
completion_2 = client.chat.completions.create(
    model="qwen-long",
    messages=messages,
    # 所有代码示例均采用流式输出，以清晰和直观地展示模型输出过程。如果您希望查看非流式输出的案例，请参见https://help.aliyun.com/zh/model-studio/text-generation
    stream=True,
    stream_options={
        "include_usage": True
    }
)

# 流式打印出追加文档后的响应
print("追加文档后的响应：")
for chunk in completion_2:
    print(chunk.model_dump())