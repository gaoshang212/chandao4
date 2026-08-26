# 更新日志

所有显著改动按版本记录于此。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [0.2.0] - 2026-08-26

### Added

- `bug show` / `task show` 详情新增附件区块，列出图片与附件的下载地址；`--json` 输出对应 `files[]`（含 `id/title/extension/size/isImage/downloadUrl` 等字段）。
- `project list` 新增 `--product <id>`，支持查询产品关联的项目。
- `bug list` 新增 `--project <id>`，支持按项目分页查询 Bug；`--product` 与 `--project` 必须二选一。

## [0.1.0] - 2026-06-25

### Added

- 查询命令：`bug my/list/show`、`task my/list/show`、`project list/show`、`product list`、`status`
- 写入命令：`bug create/update/delete`、`task create/update/delete`
- 登录管理：`login` / `logout`，凭据保存到 `~/.chandao4/config.json`
- 配置管理：`config show/set`
- 支持禅道企业版 4.1.3+，通过 Session Cookie 认证，无需管理员后台权限
- GitHub Actions 自动发布到 npm（基于 Trusted Publishing / OIDC）

[Unreleased]: https://github.com/gaoshang212/chandao4/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/gaoshang212/chandao4/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/gaoshang212/chandao4/releases/tag/v0.1.0
