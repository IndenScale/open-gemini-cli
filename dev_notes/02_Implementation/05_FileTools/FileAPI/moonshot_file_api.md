文档
API 文档
文件接口
文件接口
上传文件
注意，单个用户最多只能上传 1000 个文件，单文件不超过 100MB，同时所有已上传的文件总和不超过 10G 容量。如果您要抽取更多文件，需要先删除一部分不再需要的文件。文件解析服务限时免费，请求高峰期平台可能会有限流策略。

请求地址
POST https://api.moonshot.cn/v1/files

文件上传成功后，我们会开始抽取文件信息。

调用示例
Python 调用
# file 可以是多种类型
# purpose 目前只支持 "file-extract"
file_object = client.files.create(file=Path("xlnet.pdf"), purpose="file-extract")

支持的格式
文件接口与 Kimi 智能助手中上传文件功能所使用的相同，支持相同的文件格式，它们包括 .pdf .txt .csv .doc .docx .xls .xlsx .ppt .pptx .md .jpeg .png .bmp .gif .svg .svgz .webp .ico .xbm .dib .pjp .tif .pjpeg .avif .dot .apng .epub .tiff .jfif .html .json .mobi .log .go .h .c .cpp .cxx .cc .cs .java .js .css .jsp .php .py .py3 .asp .yaml .yml .ini .conf .ts .tsx 等格式。

文件内容抽取
该功能可以实现让模型获取文件中的信息作为上下文。本功能需要配合文件上传等功能共同使用。

调用示例
const OpenAI = require("openai");
const fs = require("fs")

const client = new OpenAI({
    apiKey: "$MOONSHOT_API_KEY",
    baseURL: "https://api.moonshot.cn/v1",
});

async function main() {
    // xlnet.pdf 是一个示例文件, 我们支持 pdf, doc 以及图片等格式, 对于图片和 pdf 文件，提供 ocr 相关能力
    let file_object = await client.files.create({
        file: fs.createReadStream("xlnet.pdf"),
        purpose: "file-extract"
    })
    // 获取结果
    // file_content = client.files.retrieve_content(file_id=file_object.id)
    // 注意，之前 retrieve_content api 在最新版本标记了 warning, 可以用下面这行代替
    // 如果是旧版本，可以用 retrieve_content
    let file_content = await (await client.files.content(file_object.id)).text()

    // 把它放进请求中
    let messages = [
        {
            "role": "system",
            "content": "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。",
        },
        {
            "role": "system",
            "content": file_content,
        },
        {"role": "user", "content": "请简单介绍 xlnet.pdf 讲了啥"},
    ]

    const completion = await client.chat.completions.create({
        model: "moonshot-v1-32k",
        messages: messages,
        temperature: 0.3
    });
    console.log(completion.choices[0].message.content);
}

main();

其中 $MOONSHOT_API_KEY 部分需要替换为您自己的 API Key。或者在调用前给它设置好环境变量。

多文件对话示例
如果你想一次性上传多个文件，并根据这些文件与 Kimi 对话，你可以参考如下示例：

from typing import *

import os
import json
from pathlib import Path

from openai import OpenAI

client = OpenAI(
    base_url="https://api.moonshot.cn/v1",
    # 我们会从环境变量中获取 MOONSHOT_DEMO_API_KEY 的值作为 API Key，
    # 请确保你已经在环境变量中正确设置了 MOONSHOT_DEMO_API_KEY 的值
    api_key=os.environ["MOONSHOT_DEMO_API_KEY"],
)


def upload_files(files: List[str]) -> List[Dict[str, Any]]:
    """
    upload_files 会将传入的文件（路径）全部通过文件上传接口 '/v1/files' 上传，并获取上传后的
    文件内容生成文件 messages。每个文件会是一个独立的 message，这些 message 的 role 均为
    system，Kimi 大模型会正确识别这些 system messages 中的文件内容。

    :param files: 一个包含要上传文件的路径的列表，路径可以是绝对路径也可以是相对路径，请使用字符串
        的形式传递文件路径。
    :return: 一个包含了文件内容的 messages 列表，请将这些 messages 加入到 Context 中，
        即请求 `/v1/chat/completions` 接口时的 messages 参数中。
    """
    messages = []

    # 对每个文件路径，我们都会上传文件并抽取文件内容，最后生成一个 role 为 system 的 message，并加入
    # 到最终返回的 messages 列表中。
    for file in files:
        file_object = client.files.create(file=Path(file), purpose="file-extract")
        file_content = client.files.content(file_id=file_object.id).text
        messages.append({
            "role": "system",
            "content": file_content,
        })

    return messages


def main():
    file_messages = upload_files(files=["upload_files.py"])

    messages = [
        # 我们使用 * 语法，来解构 file_messages 消息，使其成为 messages 列表的前 N 条 messages。
        *file_messages,
        {
            "role": "system",
            "content": "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，"
                       "准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不"
                       "可翻译成其他语言。",
        },
        {
            "role": "user",
            "content": "总结一下这些文件的内容。",
        },
    ]

    print(json.dumps(messages, indent=2, ensure_ascii=False))

    completion = client.chat.completions.create(
        model="moonshot-v1-128k",
        messages=messages,
    )

    print(completion.choices[0].message.content)


if __name__ == '__main__':
    main()


如果您的文件数量多、体积大、内容长，并且您不想在每次请求都原样携带大体积的文件内容，或是想寻求更加高效且低成本的文件对话方式，请参考使用了 Context Caching 技术的文件上传示例。

列出文件
本功能用于列举出用户已上传的所有文件。

请求地址
GET https://api.moonshot.cn/v1/files

调用示例
Python 调用
file_list = client.files.list()

for file in file_list.data:
    print(file) # 查看每个文件的信息

删除文件
本功能可以用于删除不再需要使用的文件。

请求地址
DELETE https://api.moonshot.cn/v1/files/{file_id}

调用示例
Python 调用
client.files.delete(file_id=file_id)

获取文件信息
本功能用于获取指定文件的文件基础信息。

请求地址
GET https://api.moonshot.cn/v1/files/{file_id}

调用示例
Python 调用
client.files.retrieve(file_id=file_id)
# FileObject(
# id='clg681objj8g9m7n4je0',
# bytes=761790,
# created_at=1700815879,
# filename='xlnet.pdf',
# object='file',
# purpose='file-extract',
# status='ok', status_details='') # status 如果为 error 则抽取失败

获取文件内容
本功能支持获取指定文件的文件抽取结果。通常的，它是一个合法的 JSON 格式的 string，并且对齐了我们的推荐格式。 如需抽取多个文件，您可以在某个 message 中用换行符 \n 隔开，拼接为一个大字符串，role 设置为 system 的方式加入历史记录。

请求地址
GET https://api.moonshot.cn/v1/files/{file_id}/content

调用示例
# file_content = client.files.retrieve_content(file_id=file_object.id)
# type of file_content is `str`
# 注意，之前 retrieve_content api 在最新版本标记了 warning, 可以用下面这行代替
# 如果是旧版本，可以用 retrieve_content
file_content = client.files.content(file_id=file_object.id).text
# 我们的输出结果目前是一个内部约定好格式的 json, 但是在 message 中应该以 text 格式放进去

Last updated on 2025年7月11日