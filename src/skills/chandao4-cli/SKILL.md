---
name: chandao4-cli
description: 使用 chandao4 CLI 查询或管理禅道中的 Bug、任务、项目和产品。用户要求通过当前项目命令行访问禅道、检查连接、处理 Bug 或流转任务时使用；修改 CLI 源码时不使用。
---

# 禅道 CLI

通过当前 CLI 完成用户要求，并以命令实际输出为准。

## 选择执行入口

- 默认通过 `npm install -g chandao4` 安装，并直接使用 `chandao4` 命令。
- 未安装时先完成全局安装，再执行用户要求的命令。
- 仅当用户明确要求调试当前仓库源码或验证尚未发布的功能时使用 `npm run dev --`。
- 不确定参数或仓库已变化时，先运行对应层级的 `--help`。需要完整命令表时读取 [references/commands.md](references/commands.md)。
- 自动处理结果时优先使用全局 `--json`。若 `dotenv` 提示污染标准输出，设置 `DOTENV_CONFIG_QUIET=true` 后重试。
- 仅在用户要求诊断 HTTP 问题时使用 `--debug`；请求与响应可能包含敏感信息。

## 认证与配置

- 查询前可用 `status` 检查连接。
- 缺少凭据时，请用户在终端完成 `login`，或自行配置 `ZENTAO_URL`、`ZENTAO_USERNAME`、`ZENTAO_PASSWORD`。不要在对话中索取密码。
- 配置优先级为环境变量、项目配置文件、用户配置文件、默认值。
- `config show` 会遮蔽密码，可用于排查。禁止执行 `config set server.password ...`，当前实现会把密码明文回显。
- `logout` 会删除本地凭据，仅在用户明确要求时执行。

## 执行边界

- `status`、`show`、`list`、`my` 和 `config show` 是只读操作，可按请求直接执行。
- `create`、`update`、状态流转、`config set`、`login`、`logout` 和 `delete` 会改变本地或禅道数据。只执行用户明确要求的对象与字段。
- 保留 CLI 的交互确认。仅当用户已经明确批准同一个具体操作且非交互执行确有需要时使用 `--force`。
- 删除或批量修改前核对对象类型、ID 和范围。不得根据名称猜测 ID。
- 状态流转前优先读取对象当前状态，避免执行不合法转换。
- 命令失败时报告退出状态与有效错误信息，不把模糊页面响应当作成功。

## 返回结果

- 面向人阅读时保留表格或详情输出，并概括关键结果。
- 面向脚本或后续分析时使用 JSON，只提取用户需要的字段。
- 详情中的附件使用 `files[].downloadUrl`；不要把带认证信息的调试响应或 Cookie 暴露给用户。
