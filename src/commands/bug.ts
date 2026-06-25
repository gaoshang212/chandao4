// Bug 命令

import { Command } from 'commander';
import chalk from 'chalk';
import { BugService } from '../services/bug.service';
import { formatBugTable, formatBugDetail, formatJson } from '../utils/format';
import { confirm, prompt } from '../utils/prompt';
import { isValidId, isValidBugStatus, isValidSeverity, isValidPriority } from '../utils/validators';
import { loadRawConfig } from '../config/config';

export function createBugCommand(bugService: BugService, getUseJson: () => boolean): Command {
  const bug = new Command('bug')
    .description('Bug 管理：查看、创建、更新、删除 Bug');

  // bug my - 获取当前用户的 Bug
  bug.command('my')
    .description('获取当前账号的 Bug')
    .option('-l, --limit <n>', '显示条数', (v) => parseInt(v, 10), 20)
    .option('--page <n>', '页码', (v) => parseInt(v, 10), 1)
    .action(async (options) => {
      try {
        const { bugs, total } = await bugService.getMyBugs({
          limit: options.limit,
          page: options.page,
        });

        if (bugs.length === 0) {
          console.log(chalk.gray('没有找到你的 Bug'));
        } else if (getUseJson()) {
          console.log(formatJson(bugs));
        } else {
          console.log(formatBugTable(bugs));
          const pageInfo = options.limit
            ? `第 ${options.page || 1} 页，共 ${total} 条`
            : `共 ${total} 条`;
          console.log(chalk.gray(`\n${pageInfo}`));
        }
      } catch (err) {
        process.exit(1);
      }
    });

  // bug list
  bug.command('list')
    .description('列出 Bug')
    .option('-p, --product <id>', '产品 ID', (v) => parseInt(v, 10))
    .option('-s, --status <status>', '状态过滤 (active|resolved|closed)')
    .option('-l, --limit <n>', '显示条数', (v) => parseInt(v, 10), 20)
    .option('--page <n>', '页码', (v) => parseInt(v, 10), 1)
    .action(async (options) => {
      if (!options.product) {
        console.error(chalk.red('错误: 需要指定 --product <id>'));
        process.exit(1);
      }

      if (options.status && !isValidBugStatus(options.status)) {
        console.error(chalk.red(`错误: 无效的状态 "${options.status}"，有效值: active, resolved, closed`));
        process.exit(1);
      }

      try {
        const { bugs, total } = await bugService.getList(options.product, {
          status: options.status,
          limit: options.limit,
          page: options.page,
        });

        if (bugs.length === 0) {
          console.log(chalk.gray('没有找到 Bug'));
        } else if (getUseJson()) {
          console.log(formatJson(bugs));
        } else {
          console.log(formatBugTable(bugs));
          const pageInfo = options.limit
            ? `第 ${options.page || 1} 页，共 ${total} 条`
            : `共 ${total} 条`;
          console.log(chalk.gray(`\n${pageInfo}`));
        }
      } catch (err) {
        process.exit(1);
      }
    });

  // bug show
  bug.command('show <id>')
    .description('查看 Bug 详情')
    .action(async (id) => {
      const bugId = parseInt(id, 10);
      if (!isValidId(bugId)) {
        console.error(chalk.red(`错误: 无效的 Bug ID "${id}"`));
        process.exit(1);
      }

      try {
        const bug = await bugService.getDetail(bugId);
        if (!bug) {
          console.error(chalk.red(`错误: Bug #${bugId} 未找到`));
          process.exit(1);
        }
        if (getUseJson()) {
          console.log(formatJson(bug));
        } else {
          console.log(formatBugDetail(bug));
        }
      } catch (err) {
        process.exit(1);
      }
    });

  // bug create
  bug.command('create')
    .description('创建 Bug（交互式）')
    .requiredOption('-p, --product <id>', '产品 ID', (v) => parseInt(v, 10))
    .option('-t, --title <title>', 'Bug 标题')
    .option('-s, --severity <n>', '严重程度 (1-4)', (v) => parseInt(v, 10))
    .option('-P, --priority <n>', '优先级 (1-4)', (v) => parseInt(v, 10))
    .option('--type <type>', '类型', 'code')
    .option('-a, --assigned-to <user>', '指派给（默认当前登录账号）')
    .option('--opened-build <build>', '发现版本 (build ID，多个用逗号分隔)')
    .option('--deadline <date>', '截止日期 (YYYY-MM-DD)')
    .option('--steps <text>', '重现步骤')
    .action(async (options) => {
      try {
        let title = options.title;
        let severity = options.severity;
        let priority = options.priority;
        let assignedTo = options.assignedTo;
        let openedBuild = options.openedBuild;
        let deadline = options.deadline;
        const rawCfg = loadRawConfig();
        const today = new Date().toISOString().split('T')[0];

        if (!title) {
          title = await prompt('Bug 标题');
          if (!title) {
            console.error(chalk.red('错误: Bug 标题不能为空'));
            process.exit(1);
          }
        }

        if (!severity) {
          const input = await prompt('严重程度 (1=致命, 2=严重, 3=一般, 4=建议)', '3');
          severity = parseInt(input, 10);
        }

        if (!isValidSeverity(severity)) {
          console.error(chalk.red(`错误: 无效的严重程度 "${severity}"，有效值: 1-4`));
          process.exit(1);
        }

        if (!priority) {
          const input = await prompt('优先级 (1=紧急, 2=高, 3=中, 4=低)', '3');
          priority = parseInt(input, 10);
        }

        if (!isValidPriority(priority)) {
          console.error(chalk.red(`错误: 无效的优先级 "${priority}"，有效值: 1-4`));
          process.exit(1);
        }

        const defaultUser = rawCfg.server.username || '';
        assignedTo = assignedTo || await prompt('指派给', defaultUser) || defaultUser;

        openedBuild = openedBuild || await prompt('发现版本 (build ID，默认 trunk)', 'trunk') || 'trunk';

        deadline = deadline || await prompt('截止日期 (YYYY-MM-DD)', today) || today;

        const bug = await bugService.create(options.product, {
          title,
          severity,
          priority,
          type: options.type,
          assignedTo,
          openedBuild,
          deadline,
          steps: options.steps,
        });

        if (bug) {
          console.log(chalk.green(`✓ Bug #${bug.id} 创建成功: ${bug.title}`));
        } else {
          console.log(chalk.green('✓ Bug 创建成功'));
        }
      } catch (err) {
        process.exit(1);
      }
    });

  // bug update
  bug.command('update <id>')
    .description('更新 Bug')
    .option('-t, --title <title>', 'Bug 标题')
    .option('-s, --status <status>', '状态 (active|resolved|closed)')
    .option('--severity <n>', '严重程度 (1-4)', (v) => parseInt(v, 10))
    .option('--priority <n>', '优先级 (1-4)', (v) => parseInt(v, 10))
    .option('-a, --assigned-to <user>', '指派给')
    .option('--deadline <date>', '截止日期 (YYYY-MM-DD)')
    .option('--steps <text>', '重现步骤')
    .action(async (id, options) => {
      const bugId = parseInt(id, 10);
      if (!isValidId(bugId)) {
        console.error(chalk.red(`错误: 无效的 Bug ID "${id}"`));
        process.exit(1);
      }

      if (options.status && !isValidBugStatus(options.status)) {
        console.error(chalk.red(`错误: 无效的状态 "${options.status}"`));
        process.exit(1);
      }

      const updates: Record<string, unknown> = {};
      if (options.title) updates.title = options.title;
      if (options.status) updates.status = options.status;
      if (options.severity) updates.severity = options.severity;
      if (options.priority) updates.priority = options.priority;
      if (options.assignedTo) updates.assignedTo = options.assignedTo;
      if (options.deadline) updates.deadline = options.deadline;
      if (options.steps) updates.steps = options.steps;

      if (Object.keys(updates).length === 0) {
        console.error(chalk.yellow('没有指定要更新的字段'));
        process.exit(0);
      }

      try {
        const bug = await bugService.update(bugId, updates);
        if (bug) {
          console.log(chalk.green(`✓ Bug #${bug.id} 更新成功`));
        } else {
          console.log(chalk.green('✓ Bug 更新成功'));
        }
      } catch (err) {
        process.exit(1);
      }
    });

  // bug resolve
  bug.command('resolve <id>')
    .description('解决 Bug（active → resolved）')
    .option('-r, --resolution <type>', '解决方式: fixed|bydesign|duplicate|external|notrepro|postponed', 'fixed')
    .option('--build <build>', '解决版本', 'trunk')
    .option('-a, --assigned-to <user>', '指派给（默认回指给创建者）')
    .option('-c, --comment <text>', '备注')
    .option('-f, --force', '跳过确认')
    .action(async (id, options) => {
      const bugId = parseInt(id, 10);
      if (!isValidId(bugId)) {
        console.error(chalk.red(`错误: 无效的 Bug ID "${id}"`));
        process.exit(1);
      }

      const validResolutions = ['fixed', 'bydesign', 'duplicate', 'external', 'notrepro', 'postponed'];
      if (!validResolutions.includes(options.resolution)) {
        console.error(chalk.red(`错误: 无效的解决方式 "${options.resolution}"，有效值: ${validResolutions.join(', ')}`));
        process.exit(1);
      }

      try {
        if (!options.force) {
          const confirmed = await confirm(`确定要解决 Bug #${bugId} 吗？`);
          if (!confirmed) { console.log(chalk.gray('已取消')); return; }
        }

        const bug = await bugService.resolve(bugId, {
          resolution: options.resolution,
          resolvedBuild: options.build,
          assignedTo: options.assignedTo,
          comment: options.comment,
        });
        if (bug) {
          console.log(chalk.green(`✓ Bug #${bug.id} 已解决（${options.resolution}）`));
        } else {
          console.error(chalk.red('解决 Bug 失败'));
          process.exit(1);
        }
      } catch (err) {
        process.exit(1);
      }
    });

  // bug close
  bug.command('close <id>')
    .description('关闭 Bug（resolved → closed）')
    .option('-c, --comment <text>', '备注')
    .option('-f, --force', '跳过确认')
    .action(async (id, options) => {
      const bugId = parseInt(id, 10);
      if (!isValidId(bugId)) {
        console.error(chalk.red(`错误: 无效的 Bug ID "${id}"`));
        process.exit(1);
      }

      try {
        if (!options.force) {
          const confirmed = await confirm(`确定要关闭 Bug #${bugId} 吗？`);
          if (!confirmed) { console.log(chalk.gray('已取消')); return; }
        }

        const bug = await bugService.close(bugId, options.comment);
        if (bug) {
          console.log(chalk.green(`✓ Bug #${bug.id} 已关闭`));
        } else {
          console.error(chalk.red('关闭 Bug 失败'));
          process.exit(1);
        }
      } catch (err) {
        process.exit(1);
      }
    });

  // bug activate
  bug.command('activate <id>')
    .description('激活 Bug（resolved/closed → active）')
    .option('-a, --assigned-to <user>', '指派给')
    .option('-c, --comment <text>', '备注')
    .option('-f, --force', '跳过确认')
    .action(async (id, options) => {
      const bugId = parseInt(id, 10);
      if (!isValidId(bugId)) {
        console.error(chalk.red(`错误: 无效的 Bug ID "${id}"`));
        process.exit(1);
      }

      try {
        if (!options.force) {
          const confirmed = await confirm(`确定要激活 Bug #${bugId} 吗？`);
          if (!confirmed) { console.log(chalk.gray('已取消')); return; }
        }

        const bug = await bugService.activate(bugId, {
          assignedTo: options.assignedTo,
          comment: options.comment,
        });
        if (bug) {
          console.log(chalk.green(`✓ Bug #${bug.id} 已激活（状态: ${bug.status}）`));
        } else {
          console.error(chalk.red('激活 Bug 失败'));
          process.exit(1);
        }
      } catch (err) {
        process.exit(1);
      }
    });

  // bug delete
  bug.command('delete <id>')
    .description('删除 Bug')
    .option('-f, --force', '跳过确认')
    .action(async (id, options) => {
      const bugId = parseInt(id, 10);
      if (!isValidId(bugId)) {
        console.error(chalk.red(`错误: 无效的 Bug ID "${id}"`));
        process.exit(1);
      }

      try {
        if (!options.force) {
          const confirmed = await confirm(`确定要删除 Bug #${bugId} 吗？`);
          if (!confirmed) {
            console.log(chalk.gray('已取消'));
            return;
          }
        }

        await bugService.delete(bugId);
        console.log(chalk.green(`✓ Bug #${bugId} 已删除`));
      } catch (err) {
        process.exit(1);
      }
    });

  return bug;
}