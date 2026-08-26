# 命令参考

默认安装并使用 npm 全局命令：

```text
npm install -g chandao4
```

以下示例均使用入口 `chandao4`。仅在明确调试源码时改用 `npm run dev --`。

## 全局与配置

```text
chandao4 status
chandao4 login
chandao4 logout
chandao4 install skills [--force]
chandao4 config show
chandao4 config set server.url <url>
chandao4 config set server.username <username>
```

`install skills` 使用 chandao4 的 npm 包版本管理安装。较旧版本自动升级；相同或更高版本跳过；没有版本标记的旧安装需执行一次 `--force`。

全局选项：

- `--json`：输出 JSON，适合脚本处理。
- `--debug`：打印请求与响应，仅用于授权的诊断场景。

支持的配置键为 `server.url`、`server.username`、`server.password`、`server.code`、`server.token`。不要通过 `config set` 写入密码。

## 项目与产品

```text
chandao4 project list [--product <id>] [--limit <n>] [--page <n>]
chandao4 project show <id>
chandao4 product list [--limit <n>] [--page <n>]
```

`project list` 和 `product list` 的分页在客户端完成。

## Bug 查询

```text
chandao4 bug my [--limit <n>] [--page <n>]
chandao4 bug list [--product <id>] [--project <id>] [--status <status>] [--limit <n>] [--page <n>]
chandao4 bug show <id>
```

Bug 状态为 `active`、`resolved`、`closed`。

## Bug 写入与流转

```text
chandao4 bug create --product <id> [--title <title>] [--severity <1-4>] [--priority <1-4>] [--type <type>] [--assigned-to <user>] [--opened-build <ids>] [--deadline <date>] [--steps <text>]
chandao4 bug update <id> [--title <title>] [--status <status>] [--severity <1-4>] [--priority <1-4>] [--assigned-to <user>] [--deadline <date>] [--steps <text>]
chandao4 bug resolve <id> [--resolution <type>] [--build <build>] [--assigned-to <user>] [--comment <text>] [--force]
chandao4 bug close <id> [--comment <text>] [--force]
chandao4 bug activate <id> [--assigned-to <user>] [--comment <text>] [--force]
chandao4 bug delete <id> [--force]
```

状态转换：

- `resolve`：`active` 到 `resolved`。
- `close`：`resolved` 到 `closed`。
- `activate`：`resolved` 或 `closed` 到 `active`。

`resolution` 支持 `fixed`、`bydesign`、`duplicate`、`external`、`notrepro`、`postponed`。

## 任务查询

```text
chandao4 task my [--limit <n>] [--page <n>]
chandao4 task list [--project <id>] [--status <status>] [--limit <n>] [--page <n>]
chandao4 task show <id>
```

任务状态为 `wait`、`doing`、`done`、`pause`、`cancel`、`closed`。

## 任务写入与流转

```text
chandao4 task create --project <id> [--name <name>] [--priority <1-4>] [--type <type>] [--estimate <hours>] [--assigned-to <user>] [--est-started <date>] [--deadline <date>] [--desc <text>]
chandao4 task update <id> [--name <name>] [--status <status>] [--priority <1-4>] [--assigned-to <user>] [--estimate <hours>] [--consumed <hours>] [--left <hours>] [--est-started <date>] [--deadline <date>] [--desc <text>]
chandao4 task start <id> [--consumed <hours>] [--left <hours>] [--assigned-to <user>] [--comment <text>] [--force]
chandao4 task finish <id> [--consumed <hours>] [--comment <text>] [--force]
chandao4 task close <id> [--comment <text>] [--force]
chandao4 task cancel <id> [--comment <text>] [--force]
chandao4 task activate <id> [--left <hours>] [--comment <text>] [--force]
chandao4 task delete <id> [--project <id>] [--force]
```

状态转换：

- `start`：`wait` 或 `pause` 到 `doing`。
- `finish`：`doing` 到 `done`。
- `close`：`done` 或 `cancel` 到 `closed`。
- `activate`：`cancel` 或 `closed` 到 `wait`。

`create` 会对未提供的字段进行交互式询问。日期格式为 `YYYY-MM-DD`。

## JSON 示例

```text
chandao4 --json bug show 4001
chandao4 --json task list --project 1001 --status doing
chandao4 --json project list
```

Bug 和任务详情的附件位于 `files`，下载地址位于 `files[].downloadUrl`。
