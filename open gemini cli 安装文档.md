# openai-gemini-cli 安装指南

openai-gemini-cli是gemini cli的下游分支，在保留原生对话、工具使用、长链路任务执行能力的基础上，增加了对openai compatible api的支持，从而允许用户自由选择模型供应商。

本文档旨在提供手把手的安装指南，帮助新用户安装并上手这一强大的命令行工具。

## 前期准备

1. 获得API KEY。对于月之暗面API KEY，您可以访问https://platform.moonshot.cn/console/api-keys注册并获取一个。
2. 安装node.js。您可以访问`https://nodejs.org/en/download`，或直接在浏览器中输入`https://nodejs.org/dist/v22.17.1/node-v22.17.1-x64.msi`获得安装包。

## 安装本体

在命令行中输入 `npm i @indenscale/open-gemini-cli`，等待安装完成

## 配置凭证

可以通过两种方式配置登录凭证。

您可以在希望open-gemini-cli工作的目录中创建.env文件。你可以使用记事本编辑它，然后重命名为.env，不需要保留后缀名

```.env
export OPENAI_API_KEY="your-moonshot-api-key"
export OPENAI_BASE_URL="https://api.moonshot.cn/v1"
export OPENAI_MODEL="kimi-k2-0711-preview"

GEMINI_API_KEY="your-gemini-api-key"

```

您也可以在 **系统属性-环境变量-系统环境变量/用户环境变量** 中配置`OPENAI_API_KEY` `OPENAI_BASE_URL` `OPENAI_MODEL`

## 开始使用

完成open-gemini-cli的安装后，可以开始使用了。

```bash
gemini
```

open-gemini-cli会自动监测认证方式，您也可以通过`/auth` 切换认证方式

## 注意事项

目前open gemini cli仍处于发展初期，因此存在以下已知问题。这些问题将在将来的更新中修复。

* 用量统计错误: open gemini cli无法正确统计token用量，这是gemini api与openai api的用量报告方式不同导致的。您可以使用ctrl + o查看控制台日志来了解用量。
* 错误更新提示: open gemini cli目前存在错误更新提示，会引导用户进行实际并不存在的更新。您可以直接忽略。
* 文件理解失败：open gemini cli无法理解非文本文件，包括图片、音频、视频，也包括可以包含这些模态的复杂文件，如docx、pptx、xlsx、pdf。这是由于某些openai api并不支持文件上传与自动解析。open gemini cli将在未来更新中增强文件解析能力。
