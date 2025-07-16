Files
Files are used to upload documents that can be used with features like Assistants, Fine-tuning, and Batch API.

Upload file
post

https://api.openai.com/v1/files
Upload a file that can be used across various endpoints. Individual files can be up to 512 MB, and the size of all files uploaded by one organization can be up to 100 GB.

The Assistants API supports files up to 2 million tokens and of specific file types. See the Assistants Tools guide for details.

The Fine-tuning API only supports .jsonl files. The input also has certain required formats for fine-tuning chat or completions models.

The Batch API only supports .jsonl files up to 200 MB in size. The input also has a specific required format.

Please contact us if you need to increase these storage limits.

Request body
file
file

Required
The File object (not file name) to be uploaded.

purpose
string

Required
The intended purpose of the uploaded file. One of: - assistants: Used in the Assistants API - batch: Used in the Batch API - fine-tune: Used for fine-tuning - vision: Images used for vision fine-tuning - user_data: Flexible file type for any purpose - evals: Used for eval data sets

Returns
The uploaded File object.

Example request
curl https://api.openai.com/v1/files \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F purpose="fine-tune" \
  -F file="@mydata.jsonl"
Response
{
  "id": "file-abc123",
  "object": "file",
  "bytes": 120000,
  "created_at": 1677610602,
  "filename": "mydata.jsonl",
  "purpose": "fine-tune",
}
List files
get

https://api.openai.com/v1/files
Returns a list of files.

Query parameters
after
string

Optional
A cursor for use in pagination. after is an object ID that defines your place in the list. For instance, if you make a list request and receive 100 objects, ending with obj_foo, your subsequent call can include after=obj_foo in order to fetch the next page of the list.

limit
integer

Optional
Defaults to 10000
A limit on the number of objects to be returned. Limit can range between 1 and 10,000, and the default is 10,000.

order
string

Optional
Defaults to desc
Sort order by the created_at timestamp of the objects. asc for ascending order and desc for descending order.

purpose
string

Optional
Only return files with the given purpose.

Returns
A list of File objects.

Example request
curl https://api.openai.com/v1/files \
  -H "Authorization: Bearer $OPENAI_API_KEY"
Response
{
  "data": [
    {
      "id": "file-abc123",
      "object": "file",
      "bytes": 175,
      "created_at": 1613677385,
      "filename": "salesOverview.pdf",
      "purpose": "assistants",
    },
    {
      "id": "file-abc123",
      "object": "file",
      "bytes": 140,
      "created_at": 1613779121,
      "filename": "puppy.jsonl",
      "purpose": "fine-tune",
    }
  ],
  "object": "list"
}
Retrieve file
get

https://api.openai.com/v1/files/{file_id}
Returns information about a specific file.

Path parameters
file_id
string

Required
The ID of the file to use for this request.

Returns
The File object matching the specified ID.

Example request
curl https://api.openai.com/v1/files/file-abc123 \
  -H "Authorization: Bearer $OPENAI_API_KEY"
Response
{
  "id": "file-abc123",
  "object": "file",
  "bytes": 120000,
  "created_at": 1677610602,
  "filename": "mydata.jsonl",
  "purpose": "fine-tune",
}
Delete file
delete

https://api.openai.com/v1/files/{file_id}
Delete a file.

Path parameters
file_id
string

Required
The ID of the file to use for this request.

Returns
Deletion status.

Example request
curl https://api.openai.com/v1/files/file-abc123 \
  -X DELETE \
  -H "Authorization: Bearer $OPENAI_API_KEY"
Response
{
  "id": "file-abc123",
  "object": "file",
  "deleted": true
}
Retrieve file content
get

https://api.openai.com/v1/files/{file_id}/content
Returns the contents of the specified file.

Path parameters
file_id
string

Required
The ID of the file to use for this request.

Returns
The file content.

Example request
curl https://api.openai.com/v1/files/file-abc123/content \
  -H "Authorization: Bearer $OPENAI_API_KEY" > file.jsonl
The file object
The File object represents a document that has been uploaded to OpenAI.

bytes
integer

The size of the file, in bytes.

created_at
integer

The Unix timestamp (in seconds) for when the file was created.

expires_at
integer

The Unix timestamp (in seconds) for when the file will expire.

filename
string

The name of the file.

id
string

The file identifier, which can be referenced in the API endpoints.

object
string

The object type, which is always file.

purpose
string

The intended purpose of the file. Supported values are assistants, assistants_output, batch, batch_output, fine-tune, fine-tune-results, vision, and user_data.

status
Deprecated
string

Deprecated. The current status of the file, which can be either uploaded, processed, or error.

status_details
Deprecated
string

Deprecated. For details on why a fine-tuning training file failed validation, see the error field on fine_tuning.job.

OBJECT The file object
{
  "id": "file-abc123",
  "object": "file",
  "bytes": 120000,
  "created_at": 1677610602,
  "expires_at": 1680202602,
  "filename": "salesOverview.pdf",
  "purpose": "assistants",
}


File inputs
Learn how to use PDF files as inputs to the OpenAI API.
OpenAI models with vision capabilities can also accept PDF files as input. Provide PDFs either as Base64-encoded data or as file IDs obtained after uploading files to the /v1/files endpoint through the API or dashboard.

How it works
To help models understand PDF content, we put into the model's context both the extracted text and an image of each page. The model can then use both the text and the images to generate a response. This is useful, for example, if diagrams contain key information that isn't in the text.

File URLs
You can upload PDF file inputs by linking external URLs.

Link an external URL to a file to use in a response
curl "https://api.openai.com/v1/responses" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d '{
        "model": "gpt-4.1",
        "input": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_file",
                        "file_url": "https://www.berkshirehathaway.com/letters/2024ltr.pdf"
                    },
                    {
                        "type": "input_text",
                        "text": "Analyze the letter and provide a summary of the key points."
                    }
                ]
            }
        ]
    }'
Uploading files
In the example below, we first upload a PDF using the Files API, then reference its file ID in an API request to the model.

Upload a file to use in a response
curl https://api.openai.com/v1/files \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -F purpose="user_data" \
    -F file="@draconomicon.pdf"

curl "https://api.openai.com/v1/responses" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d '{
        "model": "gpt-4.1",
        "input": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_file",
                        "file_id": "file-6F2ksmvXxt4VdoqmHRw6kL"
                    },
                    {
                        "type": "input_text",
                        "text": "What is the first dragon in the book?"
                    }
                ]
            }
        ]
    }'
Base64-encoded files
You can also send PDF file inputs as Base64-encoded inputs.

Base64 encode a file to use in a response
curl "https://api.openai.com/v1/responses" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d '{
        "model": "gpt-4.1",
        "input": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_file",
                        "filename": "draconomicon.pdf",
                        "file_data": "...base64 encoded PDF bytes here..."
                    },
                    {
                        "type": "input_text",
                        "text": "What is the first dragon in the book?"
                    }
                ]
            }
        ]
    }'
Usage considerations
Below are a few considerations to keep in mind while using PDF inputs.

Token usage

To help models understand PDF content, we put into the model's context both extracted text and an image of each page—regardless of whether the page includes images. Before deploying your solution at scale, ensure you understand the pricing and token usage implications of using PDFs as input. More on pricing.

File size limitations

You can upload up to 100 pages and 32MB of total content in a single request to the API, across multiple file inputs.

Supported models

Only models that support both text and image inputs, such as gpt-4o, gpt-4o-mini, or o1, can accept PDF files as input. Check model features here.

File upload purpose

You can upload these files to the Files API with any purpose, but we recommend using the user_data purpose for files you plan to use as model inputs.