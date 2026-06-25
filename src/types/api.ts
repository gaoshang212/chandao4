// API 响应类型

import { Bug, Task, Product, Execution, User } from './models';

// 分页列表响应
export interface ZentaoListResponse<T> {
  page: number;
  total: number;
  limit: number;
  bugs?: T[];
  tasks?: T[];
  products?: T[];
  executions?: T[];
  users?: T[];
}

// 单条响应
export interface ZentaoItemResponse<T> {
  data: T;
}

// API 业务错误
export interface ZentaoErrorResponse {
  errcode: number;
  errmsg: string;
}

// Bug API 响应
export type BugListResponse = ZentaoListResponse<Bug>;
export type BugDetailResponse = ZentaoItemResponse<Bug>;

// Task API 响应
export type TaskListResponse = ZentaoListResponse<Task>;
export type TaskDetailResponse = ZentaoItemResponse<Task>;

// Product API 响应
export type ProductListResponse = ZentaoListResponse<Product>;
export type ProductDetailResponse = ZentaoItemResponse<Product>;

// Execution API 响应
export type ExecutionListResponse = ZentaoListResponse<Execution>;

// User API 响应
export type UserListResponse = ZentaoListResponse<User>;

// 登录响应（可能是 HTML 重定向或 JSON）
export interface LoginResult {
  success: boolean;
  zentaosid?: string;
  error?: string;
}