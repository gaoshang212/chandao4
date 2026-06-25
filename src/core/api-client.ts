// API 客户端：支持 JSON 和 HTML 两种模式

import axios from 'axios';
import chalk from 'chalk';
import { AuthManager } from './auth';
import { RuntimeConfig } from '../types/config';

export class ApiClient {
  private auth: AuthManager;
  private baseUrl: string;
  private debug: boolean = false;

  constructor(config: RuntimeConfig, auth: AuthManager) {
    this.auth = auth;
    this.baseUrl = config.server.url.replace(/\/$/, '');
  }

  setDebug(enabled: boolean): void {
    this.debug = enabled;
  }

  private logRequest(method: string, url: string, body?: Record<string, string>): void {
    if (!this.debug) return;
    console.error(chalk.gray(`\n── DEBUG ──────────────────────────────`));
    console.error(chalk.cyan(`→ ${method} ${url}`));
    if (body && Object.keys(body).length > 0) {
      console.error(chalk.gray('  Body:'), JSON.stringify(body, null, 2));
    }
  }

  private logResponse(data: any): void {
    if (!this.debug) return;
    const preview = JSON.stringify(data, null, 2);
    const truncated = preview.length > 2000 ? preview.substring(0, 2000) + '\n... (truncated)' : preview;
    console.error(chalk.gray('← Response:'));
    console.error(chalk.gray(truncated));
    console.error(chalk.gray('────────────────────────────────────────\n'));
  }

  /** GET JSON 请求 */
  async getJson(url: string): Promise<any> {
    await this.auth.ensureAuth();

    const fullUrl = `${this.baseUrl}${url}`;
    this.logRequest('GET', fullUrl);

    const res = await axios.get(fullUrl, {
      headers: {
        'Cookie': this.auth.getCookieHeader(),
        'User-Agent': 'Mozilla/5.0',
      },
      timeout: 15000,
    });

    const data = res.data;
    this.logResponse(data);

    // Zentao .json 响应格式: { status: "success", data: "{...}" }
    if (data?.status === 'success' && typeof data.data === 'string') {
      try {
        return JSON.parse(data.data);
      } catch {
        return data;
      }
    }
    return data;
  }

  /** GET HTML 请求 */
  async getHtml(url: string): Promise<string> {
    await this.auth.ensureAuth();

    const res = await axios.get(`${this.baseUrl}${url}`, {
      headers: {
        'Cookie': this.auth.getCookieHeader(),
        'User-Agent': 'Mozilla/5.0',
      },
      timeout: 15000,
    });
    return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  }

  /** POST 请求（返回原始响应） */
  async postHtml(url: string, data?: Record<string, string>): Promise<string> {
    await this.auth.ensureAuth();
    const body = data ? new URLSearchParams(data).toString() : undefined;
    const fullUrl = `${this.baseUrl}${url}`;

    this.logRequest('POST', fullUrl, data);

    const res = await axios.post(fullUrl, body, {
      headers: {
        'Cookie': this.auth.getCookieHeader(),
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0',
      },
      timeout: 15000,
    });
    this.auth.updateCookies(res);

    const raw = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    this.logResponse(raw);
    return raw;
  }

  /** POST JSON 请求（解析返回的 JSON） */
  async postJson(url: string, data?: Record<string, string>): Promise<any> {
    const raw = await this.postHtml(url, data);
    try {
      const parsed = JSON.parse(raw);
      // Zentao .json 响应格式: { status: "success", data: "{...}" }
      if (parsed?.status === 'success' && typeof parsed.data === 'string') {
        try {
          return JSON.parse(parsed.data);
        } catch {
          return parsed;
        }
      }
      return parsed;
    } catch {
      return raw;
    }
  }

  async ping(): Promise<boolean> {
    try {
      const data = await this.getJson('/product-all.json');
      return data && data.products && Object.keys(data.products).length > 0;
    } catch {
      return false;
    }
  }
}