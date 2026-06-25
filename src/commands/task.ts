// Task 命令

import { Command } from 'commander';
import chalk from 'chalk';
import { TaskService } from '../services/task.service';
import { formatTaskTable, formatTaskDetail, formatJson } from '../utils/format';
import { confirm, prompt } from '../utils/prompt';
import { isValidId, isValidTaskStatus, isValidPriority } from '../utils/validators';
import { loadRawConfig } from '../config/config';

export function createTaskCommand(taskService: TaskService, getUseJson: () => boolean): Command {
  const task = new Command('task')
    .description('任务管理：查看、创建、更新、删除任务');

  // task my - 获取当前用户的任务
  task.command('my')
    .description('获取当前账号的任务')
    .option('-l, --limit <n>', '显示条数', (v) => parseInt(v, 10), 20)
    .option('--page <n>', '页码', (v) => parseInt(v, 10), 1)
    .action(async (options) => {
      try {
        const { tasks, total } = await taskService.getMyTasks();

        const limit = options.limit || 0;
        const page = options.page || 1;
        const paged = limit > 0
          ? tasks.slice((page - 1) * limit, page * limit)
          : tasks;

        if (paged.length === 0) {
          console.log(chalk.gray('没有找到你的任务'));
        } else if (getUseJson()) {
          console.log(formatJson(paged));
        } else {
          console.log(formatTaskTable(paged));
          const pageInfo = limit
            ? `第 ${page} 页，共 ${total} 条`
            : `共 ${total} 条`;
          console.log(chalk.gray(`\n${pageInfo}`));
        }
      } catch (err) {
        process.exit(1);
      }
    });

  // task list
  task.command('list')
    .description('列出任务')
    .option('-p, --project <id>', '项目 ID', (v) => parseInt(v, 10))
    .option('-s, --status <status>', '状态过滤 (wait|doing|done|pause|cancel|closed)')
    .option('-l, --limit <n>', '显示条数', (v) => parseInt(v, 10), 20)
    .option('--page <n>', '页码', (v) => parseInt(v, 10), 1)
    .action(async (options) => {
      if (!options.project) {
        console.error(chalk.red('错误: 需要指定 --project <id>（项目 ID）'));
        process.exit(1);
      }

      if (options.status && !isValidTaskStatus(options.status)) {
        console.error(chalk.red(`错误: 无效的状态 "${options.status}"，有效值: wait, doing, done, pause, cancel, closed`));
        process.exit(1);
      }

      try {
        const { tasks, total } = await taskService.getList(options.project);

        const limit = options.limit || 0;
        const page = options.page || 1;
        const paged = limit > 0
          ? tasks.slice((page - 1) * limit, page * limit)
          : tasks;

        if (paged.length === 0) {
          console.log(chalk.gray('没有找到任务'));
        } else if (getUseJson()) {
          console.log(formatJson(paged));
        } else {
          console.log(formatTaskTable(paged));
          const pageInfo = limit
            ? `第 ${page} 页，共 ${total} 条`
            : `共 ${total} 条`;
          console.log(chalk.gray(`\n${pageInfo}`));
        }
      } catch (err) {
        process.exit(1);
      }
    });

  // task show
  task.command('show <id>')
    .description('查看任务详情')
    .action(async (id) => {
      const taskId = parseInt(id, 10);
      if (!isValidId(taskId)) {
        console.error(chalk.red(`错误: 无效的任务 ID "${id}"`));
        process.exit(1);
      }

      try {
        const task = await taskService.getDetail(taskId);
        if (!task) {
          console.error(chalk.red(`错误: 任务 #${taskId} 未找到`));
          process.exit(1);
        }
        if (getUseJson()) {
          console.log(formatJson(task));
        } else {
          console.log(formatTaskDetail(task));
        }
      } catch (err) {
        process.exit(1);
      }
    });

  // task create
  task.command('create')
    .description('创建任务（交互式）')
    .requiredOption('-p, --project <id>', '项目 ID', (v) => parseInt(v, 10))
    .option('-n, --name <name>', '任务名称')
    .option('-P, --priority <n>', '优先级 (1-4)', (v) => parseInt(v, 10))
    .option('--type <type>', '类型', 'devel')
    .option('--estimate <h>', '预估工时（小时）', parseFloat)
    .option('-a, --assigned-to <user>', '指派给（默认当前登录账号）')
    .option('--est-started <date>', '预计开始 (YYYY-MM-DD)')
    .option('--deadline <date>', '截止日期 (YYYY-MM-DD)')
    .option('--desc <text>', '描述')
    .action(async (options) => {
      try {
        let name = options.name;
        let priority = options.priority;
        let assignedTo = options.assignedTo;
        let estStarted = options.estStarted;
        let deadline = options.deadline;
        const rawCfg = loadRawConfig();
        const today = new Date().toISOString().split('T')[0];

        if (!name) {
          name = await prompt('任务名称');
          if (!name) {
            console.error(chalk.red('错误: 任务名称不能为空'));
            process.exit(1);
          }
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
        assignedTo = assignedTo || await prompt(`指派给`, defaultUser) || defaultUser;

        estStarted = estStarted || await prompt('预计开始 (YYYY-MM-DD)', today) || today;

        deadline = deadline || await prompt('截止日期 (YYYY-MM-DD)', estStarted) || estStarted;

        if (!options.desc) {
          const descInput = await prompt('描述（可跳过）');
          if (descInput) options.desc = descInput;
        }

        const task = await taskService.create(options.project, {
          name,
          priority,
          type: options.type,
          estimate: options.estimate,
          assignedTo,
          estStarted,
          deadline,
          desc: options.desc,
        });

        if (task) {
          console.log(chalk.green(`✓ 任务 #${task.id} 创建成功: ${task.name}`));
        } else {
          console.log(chalk.green('✓ 任务创建成功'));
        }
      } catch (err) {
        process.exit(1);
      }
    });

  // task update
  task.command('update <id>')
    .description('更新任务')
    .option('-n, --name <name>', '任务名称')
    .option('-s, --status <status>', '状态 (wait|doing|done|pause|cancel|closed)')
    .option('--priority <n>', '优先级 (1-4)', (v) => parseInt(v, 10))
    .option('-a, --assigned-to <user>', '指派给')
    .option('--estimate <h>', '预估工时（小时）', parseFloat)
    .option('--consumed <h>', '已消耗工时（小时）', parseFloat)
    .option('--left <h>', '剩余工时（小时）', parseFloat)
    .option('--est-started <date>', '预计开始 (YYYY-MM-DD)')
    .option('--deadline <date>', '截止日期 (YYYY-MM-DD)')
    .option('--desc <text>', '描述')
    .action(async (id, options) => {
      const taskId = parseInt(id, 10);
      if (!isValidId(taskId)) {
        console.error(chalk.red(`错误: 无效的任务 ID "${id}"`));
        process.exit(1);
      }

      if (options.status && !isValidTaskStatus(options.status)) {
        console.error(chalk.red(`错误: 无效的状态 "${options.status}"`));
        process.exit(1);
      }

      const updates: Record<string, unknown> = {};
      if (options.name) updates.name = options.name;
      if (options.status) updates.status = options.status;
      if (options.priority) updates.priority = options.priority;
      if (options.assignedTo) updates.assignedTo = options.assignedTo;
      if (options.estimate !== undefined) updates.estimate = options.estimate;
      if (options.consumed !== undefined) updates.consumed = options.consumed;
      if (options.left !== undefined) updates.left = options.left;
      if (options.deadline) updates.deadline = options.deadline;
      if (options.estStarted) updates.estStarted = options.estStarted;
      if (options.desc) updates.desc = options.desc;

      if (Object.keys(updates).length === 0) {
        console.error(chalk.yellow('没有指定要更新的字段'));
        process.exit(0);
      }

      try {
        const task = await taskService.update(taskId, updates);
        if (task) {
          console.log(chalk.green(`✓ 任务 #${task.id} 更新成功`));
        } else {
          console.log(chalk.green('✓ 任务更新成功'));
        }
      } catch (err) {
        process.exit(1);
      }
    });

  // task start
  task.command('start <id>')
    .description('开始任务（wait/pause → doing）')
    .option('--consumed <h>', '已消耗工时（小时）', parseFloat)
    .option('--left <h>', '剩余工时（小时）', parseFloat)
    .option('-a, --assigned-to <user>', '指派给')
    .option('-c, --comment <text>', '备注')
    .option('-f, --force', '跳过确认')
    .action(async (id, options) => {
      const taskId = parseInt(id, 10);
      if (!isValidId(taskId)) {
        console.error(chalk.red(`错误: 无效的任务 ID "${id}"`));
        process.exit(1);
      }

      try {
        if (!options.force) {
          const confirmed = await confirm(`确定要开始任务 #${taskId} 吗？`);
          if (!confirmed) { console.log(chalk.gray('已取消')); return; }
        }

        const task = await taskService.start(taskId, {
          consumed: options.consumed,
          left: options.left,
          assignedTo: options.assignedTo,
          comment: options.comment,
        });
        if (task) {
          console.log(chalk.green(`✓ 任务 #${task.id} 已开始（状态: ${task.status}）`));
        } else {
          console.error(chalk.red('开始任务失败'));
          process.exit(1);
        }
      } catch (err) {
        process.exit(1);
      }
    });

  // task finish
  task.command('finish <id>')
    .description('完成任务（doing → done）')
    .option('--consumed <h>', '已消耗工时（小时）', parseFloat)
    .option('-c, --comment <text>', '备注')
    .option('-f, --force', '跳过确认')
    .action(async (id, options) => {
      const taskId = parseInt(id, 10);
      if (!isValidId(taskId)) {
        console.error(chalk.red(`错误: 无效的任务 ID "${id}"`));
        process.exit(1);
      }

      try {
        if (!options.force) {
          const confirmed = await confirm(`确定要完成任务 #${taskId} 吗？`);
          if (!confirmed) { console.log(chalk.gray('已取消')); return; }
        }

        const task = await taskService.finish(taskId, {
          consumed: options.consumed,
          comment: options.comment,
        });
        if (task) {
          console.log(chalk.green(`✓ 任务 #${task.id} 已完成`));
        } else {
          console.error(chalk.red('完成任务失败'));
          process.exit(1);
        }
      } catch (err) {
        process.exit(1);
      }
    });

  // task close
  task.command('close <id>')
    .description('关闭任务（done/cancel → closed）')
    .option('-c, --comment <text>', '备注')
    .option('-f, --force', '跳过确认')
    .action(async (id, options) => {
      const taskId = parseInt(id, 10);
      if (!isValidId(taskId)) {
        console.error(chalk.red(`错误: 无效的任务 ID "${id}"`));
        process.exit(1);
      }

      try {
        if (!options.force) {
          const confirmed = await confirm(`确定要关闭任务 #${taskId} 吗？`);
          if (!confirmed) { console.log(chalk.gray('已取消')); return; }
        }

        const task = await taskService.close(taskId, options.comment);
        if (task) {
          console.log(chalk.green(`✓ 任务 #${task.id} 已关闭`));
        } else {
          console.error(chalk.red('关闭任务失败'));
          process.exit(1);
        }
      } catch (err) {
        process.exit(1);
      }
    });

  // task cancel
  task.command('cancel <id>')
    .description('取消任务')
    .option('-c, --comment <text>', '取消原因')
    .option('-f, --force', '跳过确认')
    .action(async (id, options) => {
      const taskId = parseInt(id, 10);
      if (!isValidId(taskId)) {
        console.error(chalk.red(`错误: 无效的任务 ID "${id}"`));
        process.exit(1);
      }

      try {
        if (!options.force) {
          const confirmed = await confirm(`确定要取消任务 #${taskId} 吗？`);
          if (!confirmed) { console.log(chalk.gray('已取消')); return; }
        }

        const task = await taskService.cancel(taskId, options.comment);
        if (task) {
          console.log(chalk.green(`✓ 任务 #${task.id} 已取消`));
        } else {
          console.error(chalk.red('取消任务失败'));
          process.exit(1);
        }
      } catch (err) {
        process.exit(1);
      }
    });

  // task activate
  task.command('activate <id>')
    .description('激活任务（cancel/closed → wait）')
    .option('--left <h>', '剩余工时（小时）', parseFloat)
    .option('-c, --comment <text>', '备注')
    .option('-f, --force', '跳过确认')
    .action(async (id, options) => {
      const taskId = parseInt(id, 10);
      if (!isValidId(taskId)) {
        console.error(chalk.red(`错误: 无效的任务 ID "${id}"`));
        process.exit(1);
      }

      try {
        if (!options.force) {
          const confirmed = await confirm(`确定要激活任务 #${taskId} 吗？`);
          if (!confirmed) { console.log(chalk.gray('已取消')); return; }
        }

        const task = await taskService.activate(taskId, {
          left: options.left,
          comment: options.comment,
        });
        if (task) {
          console.log(chalk.green(`✓ 任务 #${task.id} 已激活（状态: ${task.status}）`));
        } else {
          console.error(chalk.red('激活任务失败'));
          process.exit(1);
        }
      } catch (err) {
        process.exit(1);
      }
    });

  // task delete
  task.command('delete <id>')
    .description('删除任务')
    .option('-p, --project <id>', '项目 ID', (v) => parseInt(v, 10))
    .option('-f, --force', '跳过确认')
    .action(async (id, options) => {
      const taskId = parseInt(id, 10);
      if (!isValidId(taskId)) {
        console.error(chalk.red(`错误: 无效的任务 ID "${id}"`));
        process.exit(1);
      }

      try {
        if (!options.force) {
          const confirmed = await confirm(`确定要删除任务 #${taskId} 吗？`);
          if (!confirmed) { console.log(chalk.gray('已取消')); return; }
        }

        await taskService.delete(taskId, options.project);
        console.log(chalk.green(`✓ 任务 #${taskId} 已删除`));
      } catch (err) {
        process.exit(1);
      }
    });

  return task;
}
