// 配置管理命令

import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, saveUserConfig } from '../config/config';

export function createConfigCommand(): Command {
  const config = new Command('config')
    .description('配置管理');

  config.command('show')
    .description('显示当前配置')
    .action(() => {
      const cfg = loadConfig();
      console.log(chalk.bold('\n当前配置:\n'));
      console.log(`  服务器:   ${cfg.server.url || chalk.gray('(未设置)')}`);
      if (cfg.server.username) {
        console.log(`  用户名:   ${cfg.server.username}`);
        console.log(`  密码:     ${chalk.gray('******')}`);
      }
      console.log(`  认证模式: ${cfg.authMode === 'apikey' ? 'API Key' : 'Session (用户名/密码)'}`);
      console.log('');
    });

  config.command('set <key> <value>')
    .description('设置配置项（保存到用户目录）')
    .action(async (key, value) => {
      const validKeys = ['server.url', 'server.username', 'server.password', 'server.code', 'server.token'];
      if (!validKeys.includes(key)) {
        console.error(chalk.red(`错误: 无效的配置项 "${key}"，有效值: ${validKeys.join(', ')}`));
        process.exit(1);
      }
      saveUserConfig(key, value);
    });

  return config;
}