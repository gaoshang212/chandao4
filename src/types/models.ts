// 业务模型类型定义

// Bug 模型
export interface Bug {
  id: number;
  title: string;
  product: number;
  module: number;
  severity: number;      // 1-4
  priority: number;      // 1-4
  status: string;        // active | resolved | closed
  type: string;          // code | config | install | etc
  assignedTo: string;
  openedBy: string;
  resolvedBy?: string;
  steps?: string;
  deadline?: string;
  openedDate: string;
  resolvedDate?: string;
  /** HTML 页面提取的所有详情字段 */
  detailFields?: Record<string, string>;
}

// Task 模型
export interface Task {
  id: number;
  name: string;
  execution: number;
  module: number;
  type: string;
  priority: number;
  status: string;        // wait | doing | done | pause | cancel | closed
  assignedTo: string;
  estimate: number;      // 预估工时
  consumed: number;      // 已消耗工时
  left: number;          // 剩余工时
  deadline?: string;
  estStarted?: string;   // 预计开始
  openedDate: string;
  /** 描述 */
  desc?: string;
  /** HTML 页面提取的所有详情字段 */
  detailFields?: Record<string, string>;
}

// Product 模型
export interface Product {
  id: number;
  name: string;
  code: string;
  status: string;
}

// Execution (迭代/执行) 模型
export interface Execution {
  id: number;
  name: string;
  code: string;
  product: number;
  type: string;          // sprint | stage | kanban
  status: string;
  begin: string;
  end?: string;
}

// User 模型
export interface User {
  id: number;
  account: string;
  realname: string;
  role: string;
}

// Bug 状态常量
export const BUG_STATUS_MAP: Record<string, string> = {
  active: '激活',
  resolved: '已解决',
  closed: '已关闭',
};

// Bug 严重程度
export const BUG_SEVERITY_MAP: Record<number, string> = {
  1: '致命',
  2: '严重',
  3: '一般',
  4: '建议',
};

// Bug 优先级
export const BUG_PRIORITY_MAP: Record<number, string> = {
  1: '紧急',
  2: '高',
  3: '中',
  4: '低',
};

// Task 状态常量
export const TASK_STATUS_MAP: Record<string, string> = {
  wait: '未开始',
  doing: '进行中',
  done: '已完成',
  pause: '已暂停',
  cancel: '已取消',
  closed: '已关闭',
};