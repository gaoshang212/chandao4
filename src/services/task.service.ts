// Task 业务逻辑 - JSON API

import { ApiClient } from '../core/api-client';
import { Task } from '../types/models';

export class TaskService {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /** 获取当前用户的任务列表 */
  async getMyTasks(): Promise<{ tasks: Task[]; total: number }> {
    const data = await this.client.getJson('/my-task.json');
    const tasks: Task[] = [];
    if (data.tasks) {
      for (const [id, t] of Object.entries(data.tasks)) {
        tasks.push(this.mapTask({ ...(t as any), id }));
      }
    }
    tasks.sort((a, b) => b.id - a.id);

    let total = tasks.length;
    if (data.summary) {
      const m = data.summary.match(/共\s*(\d+)\s*个/);
      if (m) total = parseInt(m[1], 10);
    }

    return { tasks, total };
  }

  /** 获取任务列表 */
  async getList(projectId: number): Promise<{ tasks: Task[]; total: number }> {
    const data = await this.client.getJson(`/project-task-${projectId}.json`);
    const tasks: Task[] = [];
    if (data.tasks) {
      for (const [id, t] of Object.entries(data.tasks)) {
        tasks.push(this.mapTask({ ...(t as any), id }));
      }
    }
    tasks.sort((a, b) => b.id - a.id);

    let total = tasks.length;
    if (data.summary) {
      const m = data.summary.match(/共\s*(\d+)\s*个/);
      if (m) total = parseInt(m[1], 10);
    }

    return { tasks, total };
  }

  /** 获取任务详情 */
  async getDetail(taskId: number): Promise<Task | null> {
    const data = await this.client.getJson(`/task-view-${taskId}.json`);
    if (!data.task) return null;
    return this.mapTask(data.task);
  }

  private mapTask(t: any): Task {
    return {
      id: parseInt(t.id, 10),
      name: t.name || '',
      execution: parseInt(t.project, 10) || 0,
      module: parseInt(t.module, 10) || 0,
      type: t.type || '',
      priority: parseInt(t.pri, 10) || 3,
      status: t.status || 'wait',
      assignedTo: t.assignedTo || '',
      estimate: parseFloat(t.estimate) || 0,
      consumed: parseFloat(t.consumed) || 0,
      left: parseFloat(t.left) || 0,
      deadline: t.deadline !== '0000-00-00' ? t.deadline : undefined,
      estStarted: t.estStarted !== '0000-00-00' ? t.estStarted : undefined,
      openedDate: t.openedDate || '',
      desc: t.desc || '',
      detailFields: this.buildDetailFields(t),
    };
  }

  private buildDetailFields(t: any): Record<string, string> {
    const f: Record<string, string> = {};
    const priLabels = ['', '紧急', '高', '中', '低'];
    if (t.pri) f['优先级'] = priLabels[parseInt(t.pri, 10)] || t.pri;
    if (t.status) f['状态'] = t.status;
    if (t.type) f['类型'] = t.type;
    if (t.assignedTo) f['指派给'] = t.assignedTo;
    if (t.openedBy) f['创建者'] = t.openedBy;
    if (t.openedDate) f['创建日期'] = t.openedDate;
    if (t.estimate) f['预估工时'] = `${t.estimate}h`;
    if (t.consumed) f['已消耗'] = `${t.consumed}h`;
    if (t.left) f['剩余'] = `${t.left}h`;
    if (t.deadline && t.deadline !== '0000-00-00') f['截止日期'] = t.deadline;
    if (t.desc) f['描述'] = t.desc;
    return f;
  }

  /** 检查操作是否成功（通过 resp 或实际状态验证） */
  private isSuccess(resp: any): boolean {
    if (resp === null || resp === undefined) return false;
    if (typeof resp === 'object') {
      if (resp.result === 'success' || resp.status === 'success') return true;
      // JS locate string 被 JSON 包装后 data 是字符串
      if (resp.data && typeof resp.data === 'string' && resp.data.includes('location')) return true;
    }
    // die(js::locate(...)) 返回原始 JS 字符串
    if (typeof resp === 'string' && resp.includes('location')) return true;
    return false;
  }

  async create(projectId: number, task: {
    name: string; type?: string; priority?: number; estimate?: number;
    deadline?: string; estStarted?: string; assignedTo?: string; desc?: string;
  }): Promise<Task | null> {
    const data: Record<string, string> = {
      project: String(projectId),
      name: task.name,
      type: task.type || 'devel',
      pri: String(task.priority || 3),
      'assignedTo[]': task.assignedTo || '',
      estStarted: task.estStarted || new Date().toISOString().split('T')[0],
    };
    if (task.estimate) data.estimate = String(task.estimate);
    data.deadline = task.deadline || data.estStarted;
    if (task.desc) data.desc = task.desc;

    const resp = await this.client.postJson(`/task-create-${projectId}.json`, data);

    if (resp?.result === 'success' || resp?.status === 'success') {
      const taskId = resp?.data ? parseInt(String(resp.data), 10) : 0;
      if (taskId > 0) {
        return this.getDetail(taskId);
      }
      const { tasks } = await this.getList(projectId);
      if (tasks.length > 0) {
        const byName = tasks.find(t => t.name === task.name);
        if (byName) return byName;
        return tasks[0];
      }
    }

    if (resp?.message) { console.error('创建失败:', resp.message); return null; }
    return null;
  }

  async update(taskId: number, updates: Record<string, unknown>): Promise<Task | null> {
    const current = await this.getDetail(taskId);
    if (!current) {
      console.error('更新失败: 任务不存在');
      return null;
    }

    const data: Record<string, string> = {};
    if (updates.name) data.name = String(updates.name);
    if (updates.status) data.status = String(updates.status);
    if (updates.priority !== undefined) data.pri = String(updates.priority);
    if (updates.assignedTo) data.assignedTo = String(updates.assignedTo);
    if (updates.consumed !== undefined) data.consumed = String(updates.consumed);
    if (updates.left !== undefined) data.left = String(updates.left);
    if (updates.desc) data.desc = String(updates.desc);

    data.estimate = updates.estimate !== undefined
      ? String(updates.estimate)
      : String(current.estimate || 0);
    data.estStarted = String(updates.estStarted || current.estStarted || '');
    data.deadline = String(updates.deadline || current.deadline || '');

    if (!data.estStarted || data.estStarted === '') data.estStarted = new Date().toISOString().split('T')[0];
    if (!data.deadline || data.deadline === '') data.deadline = data.estStarted;

    await this.client.postJson(`/task-edit-${taskId}.json`, data);
    return this.getDetail(taskId);
  }

  /** 取消任务 */
  async cancel(taskId: number, comment?: string): Promise<Task | null> {
    // comment 字段确保 $_POST 非空，禅道以此判断是否执行取消操作
    const data: Record<string, string> = { comment: comment || '' };

    await this.client.postJson(`/task-cancel-${taskId}.json`, data);
    const task = await this.getDetail(taskId);
    if (task && task.status !== 'cancel') {
      console.error('取消失败: 服务端未能更新任务状态，当前状态为', task.status);
      return null;
    }
    return task;
  }

  /** 开始任务（wait/pause → doing） */
  async start(taskId: number, options?: { consumed?: number; left?: number; assignedTo?: string; comment?: string }): Promise<Task | null> {
    const data: Record<string, string> = { comment: options?.comment || '' };
    if (options?.consumed !== undefined) data.consumed = String(options.consumed);
    if (options?.left !== undefined) data.left = String(options.left);
    if (options?.assignedTo) data.assignedTo = options.assignedTo;

    await this.client.postJson(`/task-start-${taskId}.json`, data);
    const task = await this.getDetail(taskId);
    if (task && task.status !== 'doing') {
      console.error('开始失败: 服务端未能更新任务状态，当前状态为', task.status);
      return null;
    }
    return task;
  }

  /** 完成任务（doing → done） */
  async finish(taskId: number, options?: { consumed?: number; comment?: string }): Promise<Task | null> {
    const data: Record<string, string> = { left: '0' };
    if (options?.consumed !== undefined) data.consumed = String(options.consumed);
    if (options?.comment) data.comment = options.comment;

    await this.client.postJson(`/task-finish-${taskId}.json`, data);
    const task = await this.getDetail(taskId);
    if (task && task.status !== 'done') {
      console.error('完成失败: 服务端未能更新任务状态，当前状态为', task.status);
      return null;
    }
    return task;
  }

  /** 关闭任务（done/cancel → closed） */
  async close(taskId: number, comment?: string): Promise<Task | null> {
    const data: Record<string, string> = { comment: comment || '' };

    await this.client.postJson(`/task-close-${taskId}.json`, data);
    const task = await this.getDetail(taskId);
    if (task && task.status !== 'closed') {
      console.error('关闭失败: 服务端未能更新任务状态，当前状态为', task.status);
      return null;
    }
    return task;
  }

  /** 激活任务（cancel/closed → wait） */
  async activate(taskId: number, options?: { left?: number; comment?: string }): Promise<Task | null> {
    const data: Record<string, string> = { comment: options?.comment || '' };
    if (options?.left !== undefined) data.left = String(options.left);

    await this.client.postJson(`/task-activate-${taskId}.json`, data);
    return this.getDetail(taskId);
  }

  async delete(taskId: number, projectId?: number): Promise<void> {
    const pid = projectId || 0;
    const resp = await this.client.getJson(`/task-delete-${pid}-${taskId}-yes.json`);
    if (resp?.result !== 'success' && resp?.message) {
      console.error('删除失败:', resp.message);
    }
  }
}
