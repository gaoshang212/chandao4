#!/usr/bin/env node
// 禅道 CLI - 主入口
// Web HTML 解析模式 - 无需 REST API 权限

import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import ora from 'ora';
import { loadConfig, loadRawConfig } from './config/config';
import { AuthManager } from './core/auth';
import { ApiClient } from './core/api-client';
import { BugService } from './services/bug.service';
import { TaskService } from './services/task.service';
import { ProductService } from './services/product.service';
import { ProjectService } from './services/project.service';
import { createBugCommand } from './commands/bug';
import { createTaskCommand } from './commands/task';
import { createProductCommand } from './commands/product';
import { createProjectCommand } from './commands/project';
import { createConfigCommand } from './commands/config';
import { createLoginCommand, createLogoutCommand } from './commands/login';
import { createInstallCommand } from './commands/install';
import { formatProductTable, formatProjectTable } from './utils/format';

// 加载 .env 文件
dotenv.config();

// 懒初始化服务（只在需要网络请求时才校验配置）
let _services: ReturnType<typeof createServices> | null = null;

function createServices() {
  const config = loadConfig();
  const auth = new AuthManager(config);
  const apiClient = new ApiClient(config, auth);
  return {
    config,
    auth,
    apiClient,
    bugService: new BugService(apiClient),
    taskService: new TaskService(apiClient),
    productService: new ProductService(apiClient),
    projectService: new ProjectService(apiClient),
  };
}

function getServices() {
  if (!_services) {
    _services = createServices();
    _services.apiClient.setDebug(getDebug());
  }
  return _services;
}

const program = new Command();

program
  .name('chandao4')
  .description('禅道命令行工具 - Bug、任务、项目和产品管理')
  .version('0.1.0')
  .option('--json', '以 JSON 格式输出')
  .option('--debug', '打印详细的请求和响应信息');

function getUseJson(): boolean {
  return program.opts().json || false;
}

function getDebug(): boolean {
  return program.opts().debug || false;
}

// ---- status 命令 ----
program.command('status')
  .description('检查禅道服务器连接状态')
  .action(async () => {
    const spinner = ora('正在连接禅道服务器...').start();

    try {
      const { config, auth, productService, projectService } = getServices();

      spinner.text = '正在登录...';
      const authed = await auth.ensureAuth();
      if (!authed) {
        spinner.fail('连接失败');
        console.log(chalk.red('\n认证失败。请检查:'));
        console.log('  1. 服务器 URL 是否正确');
        console.log('  2. 用户名密码是否正确');
        console.log('  3. 网络是否能访问禅道服务器');
        console.log(chalk.gray('\n💡 运行 chandao4 login 重新配置'));
        process.exit(1);
      }

      spinner.text = '正在获取数据...';
      const { products, total: pTotal } = await productService.getList();
      const { projects, total: prjTotal } = await projectService.getList();

      spinner.succeed('连接成功');
      console.log(chalk.green(`\n✓ 禅道服务器: ${config.server.url}`));
      console.log(chalk.green(`✓ 认证模式: ${auth.getAuthMode() === 'apikey' ? 'API Key' : 'Session (用户名/密码)'}`));
      console.log(chalk.green(`✓ 账户: ${config.server.username}`));

      if (!getUseJson()) {
        if (projects.length > 0) {
          console.log(chalk.bold(`\n项目 (${prjTotal}):\n`));
          console.log(formatProjectTable(projects.slice(0, 10)));
          if (prjTotal > 10) console.log(chalk.gray(`  ... 还有 ${prjTotal - 10} 个项目，用 chandao4 project list 查看全部`));
        }
        if (products.length > 0) {
          console.log(chalk.bold(`\n产品 (${pTotal}):\n`));
          console.log(formatProductTable(products.slice(0, 10)));
          if (pTotal > 10) console.log(chalk.gray(`  ... 还有 ${pTotal - 10} 个产品，用 chandao4 product list 查看全部`));
        }
      }
    } catch (err) {
      spinner.fail('连接失败');
      console.error(String(err));
      process.exit(1);
    }
  });

// 注册子命令
program.addCommand(createLoginCommand());
program.addCommand(createLogoutCommand());
program.addCommand(createConfigCommand());
program.addCommand(createInstallCommand());
// 需要网络访问的命令通过 getter 懒加载
program.addCommand(createProjectCommand(
  new Proxy({} as ProjectService, { get(_, p) { return (getServices().projectService as any)[p]; } }),
  getUseJson,
));
program.addCommand(createProductCommand(
  new Proxy({} as ProductService, { get(_, p) { return (getServices().productService as any)[p]; } }),
  getUseJson,
));
program.addCommand(createBugCommand(
  new Proxy({} as BugService, { get(_, p) { return (getServices().bugService as any)[p]; } }),
  getUseJson,
));
program.addCommand(createTaskCommand(
  new Proxy({} as TaskService, { get(_, p) { return (getServices().taskService as any)[p]; } }),
  getUseJson,
));

// 启动
program.parse(process.argv);

// 无参数时显示帮助
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
