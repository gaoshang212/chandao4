// 错误处理

import { ZentaoErrorResponse } from '../types/api';
import chalk from 'chalk';

/**
 * API 错误类
 */
export class ZentaoApiError extends Error {
  public errcode: number;
  public errmsg: string;

  constructor(errcode: number, errmsg: string) {
    super(errmsg);
    this.name = 'ZentaoApiError';
    this.errcode = errcode;
    this.errmsg = errmsg;
  }
}

/**
 * 格式化 API 错误信息
 */
export function formatApiError(err: unknown): string {
  if (err instanceof ZentaoApiError) {
    switch (err.errcode) {
      case 401:
        return chalk.red('认证失败: 请检查用户名/密码，或 code/token 是否正确');
      case 403:
        return chalk.red('没有权限执行此操作');
      case 404:
        return chalk.yellow('资源不存在');
      default:
        return chalk.red(`API 错误 [${err.errcode}]: ${err.errmsg}`);
    }
  }

  if (err instanceof Error) {
    if ((err as any).code === 'ECONNREFUSED' || (err as any).code === 'ENOTFOUND') {
      return chalk.red('无法连接到禅道服务器，请检查 URL 和网络');
    }
    if ((err as any).code === 'ETIMEDOUT' || (err as any).code === 'ECONNABORTED') {
      return chalk.red('请求超时，请检查网络或服务器状态');
    }
    return chalk.red(`错误: ${err.message}`);
  }

  return chalk.red('未知错误');
}

/**
 * 判断是否为 Zentao API 错误响应
 */
export function isZentaoError(data: unknown): data is ZentaoErrorResponse {
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    return typeof obj.errcode === 'number' && typeof obj.errmsg === 'string';
  }
  return false;
}