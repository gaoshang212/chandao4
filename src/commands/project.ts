// Project 命令

import { Command } from 'commander';
import chalk from 'chalk';
import { ProjectService } from '../services/project.service';
import { formatProjectTable, formatJson } from '../utils/format';

export function createProjectCommand(projectService: ProjectService, getUseJson: () => boolean): Command {
  const project = new Command('project')
    .description('项目管理');

  project.command('list')
    .description('列出项目，可按产品筛选')
    .option('-p, --product <id>', '产品 ID', (v) => parseInt(v, 10))
    .option('-l, --limit <n>', '每页条数（客户端分页）', (v) => parseInt(v, 10), 0)
    .option('--page <n>', '页码', (v) => parseInt(v, 10), 1)
    .action(async (options) => {
      if (options.product !== undefined && (!Number.isInteger(options.product) || options.product <= 0)) {
        console.error(chalk.red('错误: 无效的产品 ID'));
        process.exit(1);
      }

      try {
        const { projects, total } = await projectService.getList(options.product);
        const limit = options.limit || 0;
        const page = options.page || 1;
        const paged = limit > 0
          ? projects.slice((page - 1) * limit, page * limit)
          : projects;

        if (getUseJson()) {
          console.log(formatJson(paged));
        } else {
          console.log(formatProjectTable(paged));
          const pageInfo = limit ? `第 ${page} 页，共 ${total} 条` : `共 ${total} 条`;
          console.log(chalk.gray(`\n${pageInfo}`));
        }
      } catch (err) {
        process.exit(1);
      }
    });

  project.command('show <id>')
    .description('查看项目详情')
    .action(async (id) => {
      const pid = parseInt(id, 10);
      if (isNaN(pid)) { console.error(chalk.red(`错误: 无效的项目 ID "${id}"`)); process.exit(1); }
      try {
        const p = await projectService.getDetail(pid);
        if (!p) { console.error(chalk.red(`错误: 项目 #${pid} 未找到`)); process.exit(1); }
        if (getUseJson()) {
          console.log(formatJson(p));
        } else {
          console.log(chalk.bold(`\n项目 #${p.id}: ${p.name}\n`));
          console.log(`${chalk.gray('代号:')}  ${p.code || '-'}`);
          console.log(`${chalk.gray('状态:')}  ${p.status || '-'}`);
          console.log(`${chalk.gray('开始:')}  ${p.begin || '-'}`);
          console.log(`${chalk.gray('结束:')}  ${p.end || '-'}`);
          console.log(chalk.gray(`\n💡 查看项目任务: zentao task list -p ${p.id}`));
        }
      } catch (err) { process.exit(1); }
    });

  return project;
}
