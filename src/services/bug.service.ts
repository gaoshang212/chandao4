// Bug 业务逻辑 - JSON API

import { ApiClient } from '../core/api-client';
import { Bug } from '../types/models';
import { parseAttachments, extractInlineAttachments, mergeAttachments } from '../utils/attachment';

export class BugService {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /** 获取当前用户的 Bug 列表 */
  async getMyBugs(options?: { limit?: number; page?: number }): Promise<{ bugs: Bug[]; total: number }> {
    const data = await this.client.getJson(this.myBugPath(options));

    const rawBugs = data.bugs || (data as any);
    const bugs: Bug[] = [];
    if (Array.isArray(rawBugs)) {
      for (const b of rawBugs) bugs.push(this.mapBug(b));
    } else if (typeof rawBugs === 'object') {
      for (const [id, b] of Object.entries(rawBugs)) {
        if (b && typeof b === 'object') bugs.push(this.mapBug({ ...(b as any), id }));
      }
    }
    bugs.sort((a, b) => b.id - a.id);

    let total = bugs.length;
    if (data.summary) {
      const m = (data.summary as string).match(/共\s*(\d+)\s*个/);
      if (m) total = parseInt(m[1], 10);
    }

    return { bugs, total };
  }

  /** 获取 Bug 列表 */
  async getList(productId: number, options?: {
    status?: string;
    limit?: number;
    page?: number;
  }): Promise<{ bugs: Bug[]; total: number }> {
    const data = await this.client.getJson(this.bugBrowsePath(productId, { limit: options?.limit, page: options?.page }));

    const rawBugs = data.bugs || (data as any);
    const bugs: Bug[] = [];
    if (Array.isArray(rawBugs)) {
      for (const b of rawBugs) bugs.push(this.mapBug(b));
    } else if (typeof rawBugs === 'object') {
      for (const [id, b] of Object.entries(rawBugs)) {
        if (b && typeof b === 'object') bugs.push(this.mapBug({ ...(b as any), id }));
      }
    }
    bugs.sort((a, b) => b.id - a.id);

    let total = bugs.length;
    if (data.summary) {
      const m = (data.summary as string).match(/共\s*(\d+)\s*个/);
      if (m) total = parseInt(m[1], 10);
    }

    return { bugs, total };
  }

  /** 获取项目关联的 Bug 列表 */
  async getListByProject(projectId: number, options?: {
    limit?: number;
    page?: number;
  }): Promise<{ bugs: Bug[]; total: number }> {
    const data = await this.client.getJson(this.projectBugPath(projectId, options));
    const rawBugs = data.bugs || [];
    const bugs: Bug[] = [];

    if (Array.isArray(rawBugs)) {
      for (const b of rawBugs) bugs.push(this.mapBug(b));
    } else if (typeof rawBugs === 'object') {
      for (const [id, b] of Object.entries(rawBugs)) {
        if (b && typeof b === 'object') bugs.push(this.mapBug({ ...(b as any), id }));
      }
    }
    bugs.sort((a, b) => b.id - a.id);

    const pagerTotal = parseInt(String(data.pager?.recTotal ?? ''), 10);
    return { bugs, total: Number.isNaN(pagerTotal) ? bugs.length : pagerTotal };
  }

  // 禅道 PATH_INFO 路由：要传 recPerPage 必须把前面参数段都补齐。query string 不被识别。
  private myBugPath(opts?: { limit?: number; page?: number }): string {
    if (!opts?.limit || opts.limit <= 0) return '/my-bug.json';
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    // my-bug-{type}-{orderBy}-{recTotal}-{recPerPage}-{pageID}
    return `/my-bug-assignedTo-id_desc-0-${opts.limit}-${page}.json`;
  }

  private bugBrowsePath(productId: number, opts?: { limit?: number; page?: number }): string {
    if (!opts?.limit || opts.limit <= 0) return `/bug-browse-${productId}.json`;
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    // bug-browse-{productID}-{branch}-{browseType}-{param}-{orderBy}-{recTotal}-{recPerPage}-{pageID}
    return `/bug-browse-${productId}-0-all-0-id_desc-0-${opts.limit}-${page}.json`;
  }

  private projectBugPath(projectId: number, opts?: { limit?: number; page?: number }): string {
    if (!opts?.limit || opts.limit <= 0) return `/project-bug-${projectId}.json`;
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    // project-bug-{projectID}-{orderBy}-{build}-{type}-{param}-{recTotal}-{recPerPage}-{pageID}
    return `/project-bug-${projectId}-status,id_desc-0-all-0-0-${opts.limit}-${page}.json`;
  }

  /** 获取 Bug 详情 */
  async getDetail(bugId: number): Promise<Bug | null> {
    const data = await this.client.getJson(`/bug-view-${bugId}.json`);
    if (!data.bug) return null;
    const bug = this.mapBug(data.bug);
    const baseUrl = this.client.getBaseUrl();
    const primary = parseAttachments(data.files ?? data.bug.files, baseUrl);
    const inline = extractInlineAttachments(String(data.bug.steps || ''), baseUrl);
    const files = mergeAttachments(primary, inline);
    if (files.length) bug.files = files;
    return bug;
  }

  private mapBug(b: any): Bug {
    return {
      id: parseInt(b.id, 10),
      title: b.title || '',
      product: parseInt(b.product, 10) || 0,
      module: parseInt(b.module, 10) || 0,
      severity: parseInt(b.severity, 10) || 3,
      priority: parseInt(b.pri, 10) || 3,
      status: b.status || 'active',
      type: b.type || '',
      assignedTo: b.assignedTo || '',
      openedBy: b.openedBy || '',
      resolvedBy: b.resolvedBy || undefined,
      deadline: b.deadline !== '0000-00-00' ? b.deadline : undefined,
      steps: b.steps || '',
      openedDate: b.openedDate || '',
      resolvedDate: b.resolvedDate || undefined,
      detailFields: this.buildDetailFields(b),
    };
  }

  private buildDetailFields(b: any): Record<string, string> {
    const f: Record<string, string> = {};
    if (b.severity) f['严重程度'] = ['', '致命', '严重', '一般', '建议'][parseInt(b.severity, 10)] || b.severity;
    if (b.pri) f['优先级'] = ['', '紧急', '高', '中', '低'][parseInt(b.pri, 10)] || b.pri;
    if (b.status) f['状态'] = b.status;
    if (b.type) f['类型'] = b.type;
    if (b.assignedTo) f['指派给'] = b.assignedTo;
    if (b.openedBy) f['创建者'] = b.openedBy;
    if (b.openedDate) f['创建日期'] = b.openedDate;
    if (b.resolvedBy) f['解决者'] = b.resolvedBy;
    if (b.resolvedDate) f['解决日期'] = b.resolvedDate;
    if (b.deadline && b.deadline !== '0000-00-00') f['截止日期'] = b.deadline;
    if (b.steps) f['重现步骤'] = b.steps.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim();
    return f;
  }

  async create(productId: number, bug: {
    title: string; severity: number; priority: number;
    type?: string; module?: number; assignedTo?: string; steps?: string;
    openedBuild?: string; deadline?: string;
  }): Promise<Bug | null> {
    const data: Record<string, string> = {
      title: bug.title, severity: String(bug.severity),
      pri: String(bug.priority), type: bug.type || 'codeerror',
      product: String(productId), module: String(bug.module || 0),
      'openedBuild[]': bug.openedBuild || 'trunk',
    };
    if (bug.assignedTo) data.assignedTo = bug.assignedTo;
    if (bug.steps) data.steps = bug.steps;
    data.deadline = bug.deadline || new Date().toISOString().split('T')[0];

    const resp = await this.client.postJson(`/bug-create-${productId}.json`, data);

    if (resp?.result === 'success' || resp?.status === 'success') {
      const bugId = resp?.data ? parseInt(String(resp.data), 10) : 0;
      if (bugId > 0) {
        return this.getDetail(bugId);
      }
      const { bugs } = await this.getList(productId);
      const created = bugs.find(b => b.title === bug.title) || (bugs.length > 0 ? bugs.reduce((a, b) => a.id > b.id ? a : b) : null);
      if (created) return created;
    }

    if (resp?.message) { console.error('创建失败:', resp.message); return null; }
    return null;
  }

  async update(bugId: number, updates: Record<string, unknown>): Promise<Bug | null> {
    const current = await this.getDetail(bugId);
    if (!current) {
      console.error('更新失败: Bug 不存在');
      return null;
    }

    const data: Record<string, string> = {};
    if (updates.title) data.title = String(updates.title);
    if (updates.status) data.status = String(updates.status);
    if (updates.severity !== undefined) data.severity = String(updates.severity);
    if (updates.priority !== undefined) data.pri = String(updates.priority);
    if (updates.assignedTo) data.assignedTo = String(updates.assignedTo);
    if (updates.steps) data.steps = String(updates.steps);

    if (!data.title) data.title = current.title;
    data.deadline = String(updates.deadline || current.deadline || '');

    await this.client.postJson(`/bug-edit-${bugId}.json`, data);
    return this.getDetail(bugId);
  }

  /**
   * 解决 Bug（active/reopened → resolved）
   * resolution: fixed | bydesign | duplicate | external | notrepro | postponed
   */
  async resolve(bugId: number, options: {
    resolution: string;
    resolvedBuild?: string;
    comment?: string;
    assignedTo?: string;
  }): Promise<Bug | null> {
    const data: Record<string, string> = {
      resolution: options.resolution,
      'resolvedBuild[]': options.resolvedBuild || 'trunk',
    };
    if (options.assignedTo) data.assignedTo = options.assignedTo;
    if (options.comment) data.comment = options.comment;

    await this.client.postJson(`/bug-resolve-${bugId}.json`, data);
    const bug = await this.getDetail(bugId);
    if (bug && bug.status !== 'resolved') {
      console.error('解决失败: 服务端未能更新 Bug 状态，当前状态为', bug.status);
      return null;
    }
    return bug;
  }

  /** 关闭 Bug（resolved → closed） */
  async close(bugId: number, comment?: string): Promise<Bug | null> {
    const data: Record<string, string> = { comment: comment || '' };

    await this.client.postJson(`/bug-close-${bugId}.json`, data);
    const bug = await this.getDetail(bugId);
    if (bug && bug.status !== 'closed') {
      console.error('关闭失败: 服务端未能更新 Bug 状态，当前状态为', bug.status);
      return null;
    }
    return bug;
  }

  /** 激活 Bug（resolved/closed → active） */
  async activate(bugId: number, options?: { assignedTo?: string; comment?: string }): Promise<Bug | null> {
    const data: Record<string, string> = { comment: options?.comment || '' };
    if (options?.assignedTo) data.assignedTo = options.assignedTo;

    await this.client.postJson(`/bug-activate-${bugId}.json`, data);
    const bug = await this.getDetail(bugId);
    if (bug && bug.status !== 'active') {
      console.error('激活失败: 服务端未能更新 Bug 状态，当前状态为', bug.status);
      return null;
    }
    return bug;
  }

  async delete(bugId: number): Promise<void> {
    const resp = await this.client.getJson(`/bug-delete-${bugId}-yes.json`);
    if (resp?.result !== 'success' && resp?.message) {
      console.error('删除失败:', resp.message);
    }
  }
}
