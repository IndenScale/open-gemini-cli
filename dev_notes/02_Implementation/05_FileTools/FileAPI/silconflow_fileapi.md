Upload Files


Copy
curl --request POST \
  --url https://api.siliconflow.cn/v1/files \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: multipart/form-data' \
  --form purpose=batch

200

400

401

404

503

504

Copy
{
  "code": 20000,
  "message": "Ok",
  "status": true,
  "data": {
    "id": "file-jkvytbjtow",
    "object": "file",
    "bytes": 8509,
    "createdAt": 1741685396,
    "filename": "requests.jsonl",
    "purpose": "batch"
  }
}
批量处理
上传文件
Upload files

POST
/
files

Try it
Authorizations
​
Authorization
stringheaderrequired
Use the following format for authentication: Bearer <your api key>

Body
multipart/form-data
​
purpose
enum<string>required
Available options: batch
Example:
"batch"

​
file
filerequired
File to upload

Response
200

200
application/json
Successful response

​
code
integer
Example:
20000

​
message
string
Example:
"Ok"

​
status
boolean
Example:
true

​
data
object
Show child attributes

获取视频生成链接请求
获取文件列表
Powered by Mintlify

批量处理
获取文件列表
Returns a list of files.

GET
/
files

Try it
Authorizations
​
Authorization
stringheaderrequired
Use the following format for authentication: Bearer <your api key>

Query Parameters
​
purpose
enum<string>required
Filter files by their purpose

Available options: batch
​
limit
integerdefault:10
Maximum number of files to return (default 10)

Required range: x >= 1
Response
200

200
application/json
Successful response with file list

​
code
integerrequired
Example:
20000

​
message
stringrequired
Example:
"Ok"

​
status
booleanrequired
Example:
true

​
data
objectrequired
Show child attributes

Returns a list of files.


Copy
curl --request GET \
  --url https://api.siliconflow.cn/v1/files \
  --header 'Authorization: Bearer <token>'


200

400

401

404

503

504

Copy
{
  "code": 20000,
  "message": "Ok",
  "status": true,
  "data": {
    "data": [
      {
        "id": "file-kkhtqklcnm",
        "object": "file",
        "bytes": 806,
        "created_at": 1741777570,
        "filename": "requests-2.jsonl",
        "purpose": "batch",
        "line_count": 2
      }
    ],
    "object": "file"
  }
}

批量处理
创建batch任务
Upload files

POST
/
batches

Try it
Authorizations
​
Authorization
stringheaderrequired
Use the following format for authentication: Bearer <your api key>

Body
application/json
​
input_file_id
stringrequired
The ID of an uploaded file that contains requests for the new batch.

Example:
"file-jkvytbjtow"

​
endpoint
stringrequired
The endpoint to be used for all requests in the batch. Currently /v1/chat/completions is supported.

Example:
"/v1/chat/completions"

​
completion_window
stringrequired
The time frame within which the batch should be processed. The maximum value is 24 hours, and the minimum value is 336 hours.

Example:
"24h"

​
metadata
object
Set of 16 key-value pairs that can be attached to an object. This can be useful for storing additional information about the object in a structured format, and querying for objects via API or the dashboard.<\br>Keys are strings with a maximum length of 64 characters. Values are strings with a maximum length of 512 characters.

Show child attributes

​
replace
object
Show child attributes

Response
200

200
application/json
Successful response

​
id
string
Example:
"batch_rdyqgrcgjg"

​
object
string
Example:
"batch"

​
endpoint
string
Example:
"/v1/chat/completions"

​
errors
string[]
Example:
null

​
input_file_id
string
Example:
"file-jkvytbjtow"

​
completion_window
string
Example:
"24h"

​
status
string
Example:
"in_queue"

​
output_file_id
string
Example:
null

​
error_file_id
string
Example:
null

​
created_at
integer
Example:
1741685413

​
in_progress_at
integer
Example:
null

​
expires_at
integer
Example:
1741771813

​
finalizing_at
integer
Example:
null

​
completed_at
integer
Example:
null

​
failed_at
integer
Example:
null

​
expired_at
integer
Example:
null

​
cancelling_at
integer
Example:
null

​
cancelled_at
integer
Example:
null

​
request_counts
object
Example:
null

​
metadata
object
Show child attributes

Upload Files


Copy
curl --request POST \
  --url https://api.siliconflow.cn/v1/batches \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
  "input_file_id": "file-jkvytbjtow",
  "endpoint": "/v1/chat/completions",
  "completion_window": "24h"
}'

200

400

401

404

503

504

Copy
{
  "id": "batch_rdyqgrcgjg",
  "object": "batch",
  "endpoint": "/v1/chat/completions",
  "errors": null,
  "input_file_id": "file-jkvytbjtow",
  "completion_window": "24h",
  "status": "in_queue",
  "output_file_id": null,
  "error_file_id": null,
  "created_at": 1741685413,
  "in_progress_at": null,
  "expires_at": 1741771813,
  "finalizing_at": null,