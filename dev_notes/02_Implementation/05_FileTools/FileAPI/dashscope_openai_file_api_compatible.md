OpenAI文件接口兼容
更新时间：2025-04-29 13:08:51
产品详情
我的收藏
当您使用qwen-long模型分析文档，或使用OpenAI兼容-Batch推理服务时，需要使用OpenAI文件兼容接口来获取file_id。本文为您介绍OpenAI文件兼容接口的使用方法与参数。

前提条件
请开通阿里云百炼服务并获得API-KEY：获取API Key。

如果您通过OpenAI Python/Java SDK使用，请参考安装OpenAI SDK完成OpenAI SDK的安装。

我们推荐您将API-KEY配置到环境变量中以降低API-KEY的泄露风险，配置方法可参考配置API Key到环境变量。

功能描述
上传文件
当您使用qwen-long模型分析文档，或使用Batch推理服务时，需要使用上传文件接口获取file_id，通过purpose参数指定上传文件的用途。您可以上传Batch任务的单个文件最大为500 MB；当前阿里云账号下的百炼存储空间支持的最大文件数为10000个，文件总量不超过100 GB，文件暂时没有有效期。

用于文档分析用于Batch调用
您需要将purpose指定为file-extract。文件格式支持文本文件（ TXT、DOCX、PDF、XLSX、EPUB、MOBI、MD、CSV），图片文件（BMP、PNG、JPG/JPEG、GIF和PDF扫描件）。

关于通过file_id进行文档分析，请参考长上下文。
请求示例
PythonJavacurl


import os
from pathlib import Path
from openai import OpenAI

client = OpenAI(
    # 若没有配置环境变量，请用阿里云百炼API Key将下行替换为：api_key="sk-xxx",
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

# test.txt 是一个本地示例文件
file_object = client.files.create(file=Path("test.txt"), purpose="file-extract")

print(file_object.model_dump_json())

响应示例

{
    "id": "file-fe-xxx",
    "bytes": 2055,
    "created_at": 1729065448,
    "filename": "test.txt",
    "object": "file",
    "purpose": "file-extract",
    "status": "processed",
    "status_details": null
}
输入参数
输入参数与OpenAI的接口参数对齐，参数说明和可选值如下。





参数

类型

必选

说明

file

File

是

用于指定待上传的文件。

purpose

string

是

用于指定上传文件的用途，当前可选值如下：

file-extract: 用于qwen-long模型的文档理解；

batch: 用于OpenAI兼容-Batch任务，file格式必须满足输入文件格式。

返回参数




字段

类型

描述

示例值

id

string

文件的标识符。

"file-fe-123"

bytes

integer

文件大小，单位为字节。

123

created_at

integer

文件创建时的 Unix 时间戳（秒）。

1617981067

filename

string

上传的文件名。

"mydata.jsonl"

object

string

对象类型，始终为"file"。

"file"

purpose

string

与输入参数中的purpose保持一致。

"batch"

status

string

文件的当前状态。

"processed"

查询文件信息
您可以输入file_id来查询指定文件的信息。

OpenAI Python SDKOpenAI Java SDKHTTP
您可以通过在retrieve方法中指定file_id来查询文件信息。

请求示例

import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

file = client.files.retrieve(file_id="file-fe-xxx")

print(file.model_dump_json())
返回示例

{
  "id": "file-fe-xxx",
  "bytes": 27,
  "created_at": 1722480306,
  "filename": "test.txt",
  "object": "file",
  "purpose": "file-extract",
  "status": "processed",
  "status_details": null
}
输入参数




参数

类型

必选

说明

file_id

string

是

待查询的文件id。

返回参数




字段

类型

描述

示例值

id

string

文件标识符。

"file-fe-123"

bytes

integer

文件大小，单位为字节。

123456

created_at

integer

文件创建时的 Unix 时间戳（秒）。

1617981067

filename

string

文件名。

"mydata.jsonl"

object

string

对象类型，始终为 file。

"file"

purpose

string

文件的用途，有batch、file-extract、batch_output三种取值。

"batch"

查询文件列表
查询文件列表接口会返回您所有文件的信息，包括通过上传文件接口上传的文件，以及batch任务的结果文件。

OpenAI Python SDKOpenAI Java SDKHTTP
您可以通过list方法，查询您所有文件的信息。

查询文件列表接口无请求参数。
请求示例

import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

file_stk = client.files.list(after="file-fe-xxx",limit=20)
print(file_stk.model_dump_json())
返回示例

{
  "data": [
    {
      "id": "file-fe-xxx",
      "bytes": 27,
      "created_at": 1722480543,
      "filename": "test.txt",
      "object": "file",
      "purpose": "file-extract",
      "status": "processed",
      "status_details": null
    },
    {
      "id": "file-fe-yyy",
      "bytes": 431986,
      "created_at": 1718089390,
      "filename": "test.pdf",
      "object": "file",
      "purpose": "file-extract",
      "status": "processed",
      "status_details": null
    }
  ],
  "object": "list",
  "has_more": false
}
输入参数





字段

类型

传参方式

必选

描述

after

String

Query

否

用于分页的游标，参数after的取值为当前分页的最后一个File ID，表示查询该ID之后下一页的数据。

例如，若本次查询返回了20条数据，且最后一个File ID是file-fe-xxx，则后续查询时可以设置after="file-fe-xxx"，以获取列表的下一页。

limit

Integer

Query

否

每次查询返回的文件数量，取值范围[1,2000]，默认2000。

返回参数



字段

类型

描述

object

string

固定值为 “list”。

has_more

boolean

是否还有下一页数据。

data

array

返回的文件列表，列表中每个元素格式与返回参数一致。

下载Batch任务结果文件
在Batch推理任务结束后，您可以通过接口下载结果文件。

您可以通过查询文件列表或通过查询Batch任务列表返回参数中的output_file_id获取下载文件的file_id。仅支持下载以file-batch_output开头的file_id对应的文件。
OpenAI Python SDKOpenAI Java SDKHTTP
您可以通过content方法获取Batch任务结果文件内容，并通过write_to_file方法将其保存至本地。

请求示例

import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)
content = client.files.content(file_id="file-batch_output-xxx")
# 打印结果文件内容
print(content.text)
# 保存结果文件至本地
content.write_to_file("result.jsonl")
返回示例

{"id":"xxx","custom_id":"request-1","response":{"status_code":200,"request_id":"xxx","body":{"id":"xxx","object":"chat.completion","created":1729490866,"model":"qwen-turbo","choices":[{"finish_reason":"stop","index":0,"message":{"content":"2 + 2 equals 4."}}],"usage":{"completion_tokens":8,"prompt_tokens":36,"total_tokens":44},"system_fingerprint":null}},"error":null}
{"id":"yyy","custom_id":"request-2","response":{"status_code":200,"request_id":"yyy","body":{"id":"yyy","object":"chat.completion","created":1729490866,"model":"qwen-turbo","choices":[{"finish_reason":"stop","index":0,"message":{"content":"你好！有什么我可以帮你的吗？"}}],"usage":{"completion_tokens":8,"prompt_tokens":31,"total_tokens":39},"system_fingerprint":null}},"error":null}
输入参数





字段

类型

传参方式

必选

描述

file_id

string

Path

是

需要下载的文件的id

返回结果
Batch任务结果的jsonl文件，格式请参考输出文件格式。

删除文件
若您文件的个数或存储空间达到上限，可以通过删除文件接口删除指定file_id的文件。

可通过查询文件信息接口获取指定文件信息，或通过查询文件列表接口查询所有文件信息。

该接口限流为10 qps。
OpenAI Python SDKOpenAI Java SDKHTTP
您可以通过delete方法，传入file_id来删除指定文件。

请求示例

import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

file_object = client.files.delete("file-fe-xxx")
print(file_object.model_dump_json())
返回示例

{
  "object": "file",
  "deleted": true,
  "id": "file-fe-xxx"
}
输入参数




参数

类型

必选

说明

file_id

string

是

待删除文件id。

返回参数



字段

类型

描述

object

string

固定值为 “file”。

deleted

boolean

是否删除成功，true表示删除成功。

id

string

成功删除的文件的id。