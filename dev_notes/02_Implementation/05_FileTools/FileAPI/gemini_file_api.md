首页
Gemini API
模型
该内容对您有帮助吗？

发送反馈文档理解

Gemini 模型可以处理 PDF 格式的文档，并使用原生视觉功能来理解整个文档的上下文。这不仅仅是简单的文本提取，还让 Gemini 能够：

分析和解读内容，包括文本、图片、图表、图表和表格，即使是长达 1,000 页的文档也能轻松应对。
以结构化输出格式提取信息。
根据文档中的视觉和文本元素总结内容并回答问题。
转写文档内容（例如转写为 HTML），同时保留布局和格式，以便在下游应用中使用。
传递内嵌 PDF 数据
您可以在向 generateContent 发出的请求中传递内嵌 PDF 数据。 对于小于 20MB 的 PDF 载荷，您可以选择上传 base64 编码的文档，也可以直接上传本地存储的文件。

以下示例展示了如何从网址提取 PDF 并将其转换为字节以进行处理：

Python
JavaScript
Go
REST

from google import genai
from google.genai import types
import httpx

client = genai.Client()

doc_url = "https://discovery.ucl.ac.uk/id/eprint/10089234/1/343019_3_art_0_py4t4l_convrt.pdf"

# Retrieve and encode the PDF byte
doc_data = httpx.get(doc_url).content

prompt = "Summarize this document"
response = client.models.generate_content(
  model="gemini-2.5-flash",
  contents=[
      types.Part.from_bytes(
        data=doc_data,
        mime_type='application/pdf',
      ),
      prompt])
print(response.text)
您还可以从本地文件读取 PDF 以进行处理：

Python
JavaScript
Go

from google import genai
from google.genai import types
import pathlib

client = genai.Client()

# Retrieve and encode the PDF byte
filepath = pathlib.Path('file.pdf')

prompt = "Summarize this document"
response = client.models.generate_content(
  model="gemini-2.5-flash",
  contents=[
      types.Part.from_bytes(
        data=filepath.read_bytes(),
        mime_type='application/pdf',
      ),
      prompt])
print(response.text)
使用 File API 上传 PDF
您可以使用文件 API 上传更大的文档。当总请求大小（包括文件、文本提示、系统指令等）超过 20MB 时，请务必使用 File API。

注意： 借助 File API，您可以存储最多 50MB 的 PDF 文件。 文件会存储 48 小时。您可以在该期限内使用 API 密钥访问这些数据，但无法通过 API 下载这些数据。文件 API 可在已推出 Gemini API 的所有地区免费使用。
调用 media.upload 以使用 File API 上传文件。以下代码上传了一个文档文件，然后在对 models.generateContent 的调用中使用了该文件。

来自网址的大型 PDF
使用 File API 可简化通过网址上传和处理大型 PDF 文件的流程：

Python
JavaScript
Go
REST

from google import genai
from google.genai import types
import io
import httpx

client = genai.Client()

long_context_pdf_path = "https://www.nasa.gov/wp-content/uploads/static/history/alsj/a17/A17_FlightPlan.pdf"

# Retrieve and upload the PDF using the File API
doc_io = io.BytesIO(httpx.get(long_context_pdf_path).content)

sample_doc = client.files.upload(
  # You can pass a path or a file-like object here
  file=doc_io,
  config=dict(
    mime_type='application/pdf')
)

prompt = "Summarize this document"

response = client.models.generate_content(
  model="gemini-2.5-flash",
  contents=[sample_doc, prompt])
print(response.text)
本地存储的大型 PDF
Python
JavaScript
Go
REST

from google import genai
from google.genai import types
import pathlib
import httpx

client = genai.Client()

# Retrieve and encode the PDF byte
file_path = pathlib.Path('large_file.pdf')

# Upload the PDF using the File API
sample_file = client.files.upload(
  file=file_path,
)

prompt="Summarize this document"

response = client.models.generate_content(
  model="gemini-2.5-flash",
  contents=[sample_file, "Summarize this document"])
print(response.text)
您可以调用 files.get 来验证 API 是否已成功存储上传的文件并获取其元数据。只有 name（以及扩展的 uri）是唯一的。

Python
REST

from google import genai
import pathlib

client = genai.Client()

fpath = pathlib.Path('example.txt')
fpath.write_text('hello')

file = client.files.upload(file='example.txt')

file_info = client.files.get(name=file.name)
print(file_info.model_dump_json(indent=4))
传递多个 PDF
Gemini API 能够在单个请求中处理多个 PDF 文档（最多 1, 000 页），前提是文档和文本提示的总大小不超过模型的上下文窗口。

Python
JavaScript
Go
REST

from google import genai
import io
import httpx

client = genai.Client()

doc_url_1 = "https://arxiv.org/pdf/2312.11805"
doc_url_2 = "https://arxiv.org/pdf/2403.05530"

# Retrieve and upload both PDFs using the File API
doc_data_1 = io.BytesIO(httpx.get(doc_url_1).content)
doc_data_2 = io.BytesIO(httpx.get(doc_url_2).content)

sample_pdf_1 = client.files.upload(
  file=doc_data_1,
  config=dict(mime_type='application/pdf')
)
sample_pdf_2 = client.files.upload(
  file=doc_data_2,
  config=dict(mime_type='application/pdf')
)

prompt = "What is the difference between each of the main benchmarks between these two papers? Output these in a table."

response = client.models.generate_content(
  model="gemini-2.5-flash",
  contents=[sample_pdf_1, sample_pdf_2, prompt])
print(response.text)
技术详情
Gemini 最多支持 1,000 个文档页面。 每个文档页面相当于 258 个词元。

虽然除了模型的上下文窗口之外，文档中的像素数量没有具体限制，但较大的页面会被缩小到最大分辨率 3072x3072，同时保留其原始宽高比，而较小的页面会被放大到 768x768 像素。除了带宽之外，低分辨率网页不会降低费用，而高分辨率网页也不会提升性能。

文档类型
从技术上讲，您可以传递其他 MIME 类型以进行文档理解，例如 TXT、Markdown、HTML、XML 等。不过，文档视觉 仅能有意义地理解 PDF。其他类型的文件将被提取为纯文本，模型将无法解读我们在这些文件的呈现中看到的内容。所有特定于文件类型的信息（例如图表、示意图、HTML 标记、Markdown 格式等）都将丢失。

最佳做法
为了达到最佳效果，请注意以下事项：

请先将页面旋转到正确方向，然后再上传。
避免页面模糊不清。
如果使用单页，请将文本提示放在该页之后。
后续步骤
如需了解详情，请参阅以下资源：

文件提示策略：Gemini API 支持使用文本、图片、音频和视频数据进行提示，也称为多模态提示。
系统指令：系统指令可让您根据自己的特定需求和使用情形来控制模型的行为。