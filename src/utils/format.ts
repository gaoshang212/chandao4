// 表格和颜色输出格式化

import chalk from 'chalk';
import Table from 'cli-table3';
import { Bug, Task, BUG_STATUS_MAP, BUG_SEVERITY_MAP, BUG_PRIORITY_MAP, TASK_STATUS_MAP, Product, Execution } from '../types/models';
import { Project } from '../services/project.service';

/**
 * 格式化 Bug 列表为表格
 */
export function formatBugTable(bugs: Bug[]): string {
  const table = new Table({
    head: ['ID', '标题', '状态', '严重程度', '优先级', '指派给'],
    colWidths: [8, 40, 10, 10, 8, 12],
    wordWrap: true,
  });

  for (const bug of bugs) {
    table.push([
      String(bug.id),
      bug.title,
      formatBugStatus(bug.status),
      formatBugSeverity(bug.severity),
      formatBugPriority(bug.priority),
      bug.assignedTo || '-',
    ]);
  }

  return table.toString();
}

/**
 * 格式化 Bug 详情
 */
export function formatBugDetail(bug: Bug): string {
  const lines = [chalk.bold(`\nBug #${bug.id}: ${bug.title}\n`)];

  const fields = bug.detailFields || {};
  const labels = Object.keys(fields);
  if (labels.length > 0) {
    const maxLen = Math.max(...labels.map(l => l.length));
    for (const [label, value] of Object.entries(fields)) {
      if (!value || value === '-' || value === '0000-00-00' || value === '0000-00-00 00:00:00') continue;
      const display = label === '重现步骤' ? value.substring(0, 200) + (value.length > 200 ? '...' : '') : value;
      lines.push(`${chalk.gray(label.padEnd(maxLen + 1))} ${display}`);
    }
  }

  return lines.join('\n');
}

/**
 * 格式化 Task 列表为表格
 */
export function formatTaskTable(tasks: Task[]): string {
  const table = new Table({
    head: ['ID', '名称', '状态', '优先级', '指派给', '预估(h)', '已消耗(h)'],
    colWidths: [8, 35, 10, 8, 12, 10, 10],
    wordWrap: true,
  });

  for (const task of tasks) {
    table.push([
      String(task.id),
      task.name,
      formatTaskStatus(task.status),
      formatBugPriority(task.priority),
      task.assignedTo || '-',
      String(task.estimate || 0),
      String(task.consumed || 0),
    ]);
  }

  return table.toString();
}

/**
 * 格式化 Task 详情
 */
export function formatTaskDetail(task: Task): string {
  const lines = [chalk.bold(`\n任务 #${task.id}: ${task.name}\n`)];

  const fields = task.detailFields || {};
  const labels = Object.keys(fields);
  if (labels.length > 0) {
    const maxLen = Math.max(...labels.map(l => l.length));
    for (const [label, value] of Object.entries(fields)) {
      if (!value || value === '-' || value === '0000-00-00' || value === '0000-00-00 00:00:00' || value === '暂无') continue;
      lines.push(`${chalk.gray(label.padEnd(maxLen + 1))} ${value}`);
    }
  }

  return lines.join('\n');
}

/**
 * 格式化 Product 列表
 */
export function formatProductTable(products: Product[]): string {
  const table = new Table({
    head: ['ID', '名称', '代号', '状态'],
    colWidths: [8, 30, 20, 10],
  });

  for (const p of products) {
    table.push([
      String(p.id),
      p.name,
      p.code || '-',
      p.status || '-',
    ]);
  }

  return table.toString();
}

/**
 * 格式化 Execution 列表
 */
export function formatExecutionTable(executions: Execution[]): string {
  const table = new Table({
    head: ['ID', '名称', '类型', '状态', '开始日期', '结束日期'],
    colWidths: [8, 25, 10, 10, 14, 14],
  });

  for (const e of executions) {
    table.push([
      String(e.id),
      e.name,
      e.type || '-',
      e.status || '-',
      e.begin || '-',
      e.end || '-',
    ]);
  }

  return table.toString();
}

/**
 * 格式化 Project 列表
 */
export function formatProjectTable(projects: Project[]): string {
  const table = new Table({
    head: ['ID', '名称', '代号', '状态', '开始日期', '结束日期'],
    colWidths: [8, 30, 20, 10, 14, 14],
  });

  for (const p of projects) {
    table.push([
      String(p.id),
      p.name,
      p.code || '-',
      p.status || '-',
      p.begin || '-',
      p.end || '-',
    ]);
  }

  return table.toString();
}

// 状态格式化函数
export function formatBugStatus(status: string): string {
  const label = BUG_STATUS_MAP[status] || status;
  switch (status) {
    case 'active':    return chalk.red(label);
    case 'resolved':  return chalk.green(label);
    case 'closed':    return chalk.gray(label);
    default:          return label;
  }
}

export function formatBugSeverity(severity: number): string {
  const label = BUG_SEVERITY_MAP[severity] || String(severity);
  if (severity <= 2) return chalk.red(label);
  if (severity === 3) return chalk.yellow(label);
  return chalk.gray(label);
}

export function formatBugPriority(priority: number): string {
  const label = BUG_PRIORITY_MAP[priority] || String(priority);
  if (priority === 1) return chalk.red(label);
  if (priority === 2) return chalk.yellow(label);
  return chalk.green(label);
}

export function formatTaskStatus(status: string): string {
  const label = TASK_STATUS_MAP[status] || status;
  switch (status) {
    case 'doing':     return chalk.blue(label);
    case 'done':      return chalk.green(label);
    case 'closed':    return chalk.gray(label);
    case 'pause':     return chalk.yellow(label);
    case 'cancel':    return chalk.red(label);
    case 'wait':      return chalk.cyan(label);
    default:          return label;
  }
}

/**
 * JSON 输出
 */
export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}