# 更新日志

所有显著改动按版本记录于此。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [0.1.0] - 2026-06-25

### Added

- 查询命令：`bug my/list/show`、`task my/list/show`、`project list/show`、`product list`、`status`
- 写入命令：`bug create/update/delete`、`task create/update/delete`
- 登录管理：`login` / `logout`，凭据保存到 `~/.chandao4/config.json`
- 配置管理：`config show/set`
- 支持禅道企业版 4.1.3+，通过 Session Cookie 认证，无需管理员后台权限
- GitHub Actions 自动发布到 npm（基于 Trusted Publishing / OIDC）

[Unreleased]: https://github.com/gaoshang212/chandao4/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/gaoshang212/chandao4/releases/tag/v0.1.0
