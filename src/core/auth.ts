// 认证管理器：Session Cookie 登录

import axios from 'axios';
import * as crypto from 'crypto';
import { RuntimeConfig } from '../types/config';

export interface AuthState {
  zentaosid: string | null;
  account: string | null;
  expiresAt: number | null;
  /** 所有 cookie，用于后续请求 */
  cookies: Record<string, string>;
}

/**
 * 禅道企业版 4.1.3 (基于 Zentao 12.5.3) 认证管理器
 *
 * 登录流程（从页面 JS 逆向分析）：
 *   1. GET /user-login.html → 提取 verifyRand, referer + 所有 cookie
 *   2. password = md5(md5(rawPassword) + verifyRand)
 *   3. AJAX POST /user-login.html → 返回 JSON { result: "success" }
 *   4. 登录成功，zentaosid 已被激活
 */
export class AuthManager {
  private state: AuthState = {
    zentaosid: null,
    account: null,
    expiresAt: null,
    cookies: {},
  };

  private config: RuntimeConfig;

  constructor(config: RuntimeConfig) {
    this.config = config;
  }

  getSessionId(): string | null {
    if (this.state.zentaosid && this.state.expiresAt && Date.now() < this.state.expiresAt) {
      return this.state.zentaosid;
    }
    return null;
  }

  getApiKeyParams(): { code: string; token: string } | null {
    if (this.config.server.code && this.config.server.token) {
      return { code: this.config.server.code, token: this.config.server.token };
    }
    return null;
  }

  getAuthParams(): string {
    const apiKey = this.getApiKeyParams();
    if (apiKey) {
      return `code=${encodeURIComponent(apiKey.code)}&token=${encodeURIComponent(apiKey.token)}`;
    }
    return '';
  }

  getAuthMode(): 'session' | 'apikey' {
    return this.config.authMode;
  }

  isApiKeyMode(): boolean {
    return this.config.authMode === 'apikey';
  }

  /**
   * 从响应更新 cookie jar
   */
  updateCookies(res: any) {
    const setCookie = res.headers['set-cookie'];
    if (!setCookie) return;
    const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const c of arr) {
      const [nv] = c.split(';');
      const [name, ...rest] = nv.split('=');
      const key = name.trim();
      const value = rest.join('=');
      this.state.cookies[key] = value;
      if (key === 'zentaosid') {
        this.state.zentaosid = value;
      }
    }
  }

  /**
   * 获取完整的 cookie header 字符串
   */
  getCookieHeader(): string {
    return Object.entries(this.state.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  /**
   * 执行登录
   */
  async login(): Promise<boolean> {
    const { url, username, password } = this.config.server;

    if (!username || !password) {
      console.error('错误: 需要用户名和密码。');
      console.error('  设置环境变量: ZENTAO_USERNAME=yourname  ZENTAO_PASSWORD=yourpass');
      return false;
    }

    try {
      const baseUrl = url.replace(/\/$/, '');

      const client = axios.create({
        baseURL: baseUrl,
        timeout: 15000,
        maxRedirects: 5,
        headers: { 'User-Agent': 'zentao-cli/1.0' },
      });

      // ---- Step 1: 获取登录页面 ----
      const loginPageRes = await client.get('/user-login.html');
      this.updateCookies(loginPageRes);

      const html: string = typeof loginPageRes.data === 'string' ? loginPageRes.data : '';

      // 提取 verifyRand
      let verifyRand = '';
      const randMatch = html.match(/id='verifyRand'\s+value='(\d+)'/);
      if (randMatch) {
        verifyRand = randMatch[1];
      } else {
        const altMatch = html.match(/name='verifyRand'\s+id='verifyRand'\s+value='(\d+)'/);
        if (altMatch) verifyRand = altMatch[1];
      }

      // 提取 referer
      let referer = '/';
      const refMatch = html.match(/id='referer'\s+value='([^']*)'/);
      if (refMatch) referer = refMatch[1] || '/';

      // ---- Step 2: 计算密码哈希 ----
      const md5Once = crypto.createHash('md5').update(password).digest('hex');
      const hashedPassword = crypto.createHash('md5').update(md5Once + verifyRand).digest('hex');

      // ---- Step 3: AJAX POST 登录 ----
      const loginParams = new URLSearchParams();
      loginParams.append('account', username);
      loginParams.append('password', hashedPassword);
      loginParams.append('passwordStrength', '0');
      loginParams.append('referer', referer);
      loginParams.append('verifyRand', verifyRand);
      loginParams.append('keepLogin', '0');

      let loginResult: any;
      try {
        const loginRes = await client.post('/user-login.html', loginParams.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Cookie': this.getCookieHeader(),
          },
        });
        this.updateCookies(loginRes);
        loginResult = loginRes.data;
      } catch (err: any) {
        if (err.response?.status && err.response.status >= 300 && err.response.status < 400) {
          loginResult = { result: 'success', locate: err.response.headers['location'] || '/index.php?m=my&f=index' };
          if (err.response.headers['set-cookie']) {
            this.updateCookies(err.response);
          }
        } else {
          throw err;
        }
      }

      // 解析响应
      if (typeof loginResult === 'string') {
        try {
          loginResult = JSON.parse(loginResult);
        } catch {
          if (loginResult.includes('我的地盘') || loginResult.includes('my/index')) {
            loginResult = { result: 'success' };
          }
        }
      }

      if (loginResult?.result !== 'success') {
        const errMsg = loginResult?.message || '用户名或密码错误';
        console.error(`登录失败: ${errMsg}`);
        return false;
      }

      // 登录成功
      if (this.state.zentaosid) {
        this.state.account = username;
        this.state.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        return true;
      }

      console.error('登录失败: 未能获取会话 cookie');
      return false;
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        console.error(`无法连接到禅道服务器: ${this.config.server.url}`);
      } else if (err.code === 'ETIMEDOUT') {
        console.error(`连接超时: ${this.config.server.url}`);
      } else {
        console.error('登录错误:', err.message);
      }
      return false;
    }
  }

  async ensureAuth(): Promise<boolean> {
    if (this.config.authMode === 'apikey' && this.getApiKeyParams()) {
      return true;
    }
    if (this.getSessionId()) {
      return true;
    }
    return this.login();
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const cookie = this.getCookieHeader();
    if (cookie) {
      headers['Cookie'] = cookie;
    }
    return headers;
  }
}