# 禅道 CLI (chandao4)

禅道命令行工具，支持 Bug、任务、项目和产品管理。适用于禅道企业版 4.1.3+。

> ⚠️ **当前状态**：查询类命令（`list` / `show` / `my` / `status`）已稳定可用；写入类命令（`create` / `update` / `delete`）仍在完善中，使用时请自行验证结果。

## 安装

```bash
npm install -g chandao4
```

安装随 npm 包发布的 Codex skills：

```bash
chandao4 install skills

# 同版本重装、强制降级或覆盖无版本标记的旧安装
chandao4 install skills --force
```

默认安装到 `~/.codex/skills`；设置 `CODEX_HOME` 后安装到 `$CODEX_HOME/skills`。安装器使用 npm 包版本管理 skill：较旧版本会自动升级，相同或更高版本会跳过。旧安装没有版本标记时需执行一次 `--force`。

或本地开发：

```bash
git clone <repo>
cd chandao4
npm install
npm run build
npm link
```

## 快速开始

### 1. 配置

**推荐：交互式登录**

```bash
chandao4 login
```

按提示输入禅道地址、用户名、密码，自动验证并保存。

**或手动配置环境变量**

```bash
cp .env.example .env
# 编辑 .env 填写你的禅道信息
```

```bash
# .env 文件内容
ZENTAO_URL=https://your-company.chandao.com
ZENTAO_USERNAME=your-username
ZENTAO_PASSWORD=your-password
```

### 2. 测试连接

```bash
chandao4 status
```

## 命令参考

### 登录管理

```bash
# 交互式登录
chandao4 login

# 清除本地凭据
chandao4 logout
```

### 项目管理

```bash
# 列出项目
chandao4 project list
chandao4 project list --limit 10 --page 1
chandao4 project list --product 2001

# 查看项目详情
chandao4 project show 1001
```

### Bug 管理

```bash
# 获取当前账号的 Bug
chandao4 bug my
chandao4 bug my --limit 10 --page 1

# 列出 Bug
chandao4 bug list --product 2001
chandao4 bug list --product 2001 --status active --limit 10
chandao4 bug list --project 1001
chandao4 bug list --project 1001 --limit 10 --page 1

# 查看 Bug 详情（含附件/图片下载地址）
chandao4 bug show 4001

# 创建 Bug
chandao4 bug create --product 2001
chandao4 bug create --product 2001 --title "登录页面报错" --severity 2 --priority 2

# 更新 Bug
chandao4 bug update 4001 --status resolved --assigned-to zhangsan

# 删除 Bug
chandao4 bug delete 4001
chandao4 bug delete 4001 --force
```

### 任务管理

```bash
# 获取当前账号的任务
chandao4 task my
chandao4 task my --limit 10 --page 1

# 列出任务
chandao4 task list -p 1001
chandao4 task list -p 1001 --status doing --limit 10

# 查看任务详情（含附件/图片下载地址）
chandao4 task show 3001

# 创建任务
chandao4 task create -p 1001
chandao4 task create -p 1001 --name "实现登录接口" --priority 2 --estimate 4

# 更新任务
chandao4 task update 3001 --status doing --assigned-to lisi
chandao4 task update 3001 --consumed 3.5 --left 4.5

# 删除任务
chandao4 task delete 3001 -p 1001
```

### 产品管理

```bash
# 列出产品
chandao4 product list
chandao4 product list --limit 10 --page 2
```

### JSON 输出

所有命令支持 `--json` 选项用于脚本集成：

```bash
chandao4 project list --json | jq '.[] | {id, name}'
chandao4 task list -p 1001 --json | jq '.[] | {id, name, status}'
chandao4 bug my --json

# 仅取附件下载地址（图片或文件）
chandao4 bug show 4001 --json | jq '.files[] | {title, isImage, downloadUrl}'
chandao4 task show 3001 --json | jq '.files[].downloadUrl'
```

### 配置管理

```bash
chandao4 config show
chandao4 config set server.url https://your-company.chandao.com
chandao4 config set server.username yourname
```

## 开发

```bash
npm run dev -- status
npm run dev -- bug show 4001
npm run dev -- task list -p 1001
npm run build
npm run check
```

## 技术栈

- TypeScript + Commander.js
- Axios (HTTP 客户端)
- cli-table3 + Chalk (输出格式化)

## 认证

使用用户名/密码登录获取 Session Cookie，无需管理员后台权限。

方案：登入 → Session Cookie → 所有后续请求携带 Cookie 认证。

## 兼容性

| 版本 | 认证方式 | 状态 |
|------|---------|------|
| 禅道企业版 4.1.3 | Session Cookie | 测试通过 |
| 禅道开源版 12.5.3+ | Session Cookie | 理论兼容 |
| 其他版本 | - | 未测试 |
