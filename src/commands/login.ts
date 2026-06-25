// 登录/登出命令

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, loadRawConfig, saveUserConfig, clearUserConfig } from '../config/config';
import { AuthManager } from '../core/auth';
import { prompt, promptPassword, confirm } from '../utils/prompt';

export function createLoginCommand(): Command {
  const login = new Command('login')
    .description('交互式登录，保存凭据到本地')
    .action(async () => {
      console.log(chalk.bold('\n🔐 禅道登录\n'));

      const rawCfg = loadRawConfig();
      const currentUrl = rawCfg.server.url || '';
      const currentUser = rawCfg.server.username || '';

      const url = await prompt('禅道地址', currentUrl || 'https://your-company.chandao.com');
      if (!url) {
        console.error(chalk.red('错误: 地址不能为空'));
        process.exit(1);
      }

      const username = await prompt('用户名', currentUser || '');
      if (!username) {
        console.error(chalk.red('错误: 用户名不能为空'));
        process.exit(1);
      }

      const password = await promptPassword('密码');
      if (!password) {
        console.error(chalk.red('错误: 密码不能为空'));
        process.exit(1);
      }

      saveUserConfig('server.url', url);
      saveUserConfig('server.username', username);
      saveUserConfig('server.password', password);

      console.log('');
      const spinner = ora('正在验证登录...').start();
      try {
        const cfg = loadConfig();
        const auth = new AuthManager(cfg);
        const ok = await auth.login();
        if (ok) {
          spinner.succeed(chalk.green('登录成功！'));
          console.log(chalk.gray(`\n配置已保存到 ~/.chandao4/config.json`));
        } else {
          spinner.fail('登录失败，请检查地址和凭据');
        }
      } catch (err) {
        spinner.fail('连接失败');
        console.error(String(err));
      }
    });

  return login;
}

export function createLogoutCommand(): Command {
  const logout = new Command('logout')
    .description('清除本地保存的凭据')
    .action(async () => {
      console.log(chalk.bold('\n👋 退出登录\n'));
      const rawCfg = loadRawConfig();

      if (!rawCfg.server.username && !rawCfg.server.password) {
        console.log(chalk.gray('没有保存的登录凭据'));
        return;
      }

      console.log(`  服务器: ${rawCfg.server.url || chalk.gray('(未设置)')}`);
      console.log(`  用户名: ${rawCfg.server.username || chalk.gray('(未设置)')}`);

      const confirmed = await confirm('确定要清除所有本地凭据吗？');
      if (!confirmed) {
        console.log(chalk.gray('已取消'));
        return;
      }

      clearUserConfig();
      console.log(chalk.green('✓ 凭据已清除'));
    });

  return logout;
}
