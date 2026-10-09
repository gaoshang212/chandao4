// 表格和颜色输出格式化

import chalk from 'chalk';
import Table from 'cli-table3';
import { Bug, Task, BUG_STATUS_MAP, BUG_SEVERITY_MAP, BUG_PRIORITY_MAP, TASK_STATUS_MAP, Product, Execution, Attachment, ActionRecord } from '../types/models';
import { Project } from '../services/project.service';
import { formatFileSize } from './attachment';

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

  if (bug.files && bug.files.length > 0) {
    lines.push('');
    lines.push(formatAttachmentsBlock(bug.files));
  }

  if (bug.actions?.length) lines.push('', formatActions(bug.actions));

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

  if (task.files && task.files.length > 0) {
    lines.push('');
    lines.push(formatAttachmentsBlock(task.files));
  }

  if (task.actions?.length) lines.push('', formatActions(task.actions));

  return lines.join('\n');
}

/**
 * 格式化附件块：标题 + 每行一个文件，附带下载地址
 */
export function formatAttachmentsBlock(files: Attachment[]): string {
  const lines = [chalk.bold(`附件 (${files.length})`)];
  for (const f of files) {
    const tag = f.isImage ? chalk.magenta('[图]') : chalk.cyan('[件]');
    const meta = chalk.gray(`(${formatFileSize(f.size)}${f.addedBy ? `, ${f.addedBy}` : ''}${f.addedDate ? `, ${f.addedDate}` : ''})`);
    lines.push(`  ${tag} ${f.title} ${meta}`);
    lines.push(`       ${chalk.blue(f.downloadUrl)}`);
  }
  return lines.join('\n');
}

function formatActions(actions: ActionRecord[]): string {
  const labels: Record<string, string> = {
    opened: '创建', edited: '编辑', commented: '备注', assigned: '指派',
    resolved: '解决', closed: '关闭', activated: '激活', confirmed: '确认',
    started: '开始', finished: '完成', paused: '暂停', restarted: '继续',
    canceled: '取消', deleted: '删除',
  };
  const lines = [chalk.bold(`历史记录 (${actions.length})`)];
  for (const action of actions) {
    lines.push(`  ${action.date} ${action.actor} ${labels[action.action] || action.action}${action.extra ? ` (${action.extra})` : ''}`);
    if (action.comment) lines.push(`    备注: ${historyText(action.comment)}`);
    for (const change of action.history) {
      lines.push(`    ${change.field}: ${historyText(change.old) || '(空)'} → ${historyText(change.new) || '(空)'}`);
      if (change.diff) lines.push(`      差异: ${historyText(change.diff)}`);
    }
    if (action.files?.length) lines.push(formatAttachmentsBlock(action.files));
  }
  return lines.join('\n');
}

function historyText(value: string): string {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/<br\s*\/?\s*>|<\/(?:p|div|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, name: string) => entities[name])
    .trim();
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
