// 配置加载器：文件 + 环境变量 + 默认值

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { z } from 'zod';
import { ZentaoConfig, RuntimeConfig } from '../types/config';
import { DEFAULTS, CONFIG_FILE_NAMES, USER_CONFIG_DIR, USER_CONFIG_FILE } from './defaults';

// Zod schema for validation
const serverSchema = z.object({
  url: z.string().url(),
  username: z.string().optional(),
  password: z.string().optional(),
  code: z.string().optional(),
  token: z.string().optional(),
});

const outputSchema = z.object({
  format: z.enum(['table', 'json']).default('table'),
  color: z.boolean().default(true),
});

const configSchema = z.object({
  server: serverSchema,
  output: outputSchema.optional(),
});

/**
 * 加载配置文件（项目级或用户级）
 */
function loadConfigFile(): Partial<ZentaoConfig> | null {
  // 1. 尝试项目级配置
  const cwd = process.cwd();
  for (const name of CONFIG_FILE_NAMES) {
    const filePath = path.join(cwd, name);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
      } catch {
        // 配置文件格式错误，忽略
      }
    }
  }

  // 2. 尝试用户级配置
  const userConfigPath = path.join(os.homedir(), USER_CONFIG_DIR, USER_CONFIG_FILE);
  if (fs.existsSync(userConfigPath)) {
    try {
      const content = fs.readFileSync(userConfigPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      // 配置文件格式错误，忽略
    }
  }

  return null;
}

/**
 * 从环境变量加载配置
 */
function loadEnvConfig(): Partial<ZentaoConfig> {
  const config: Partial<ZentaoConfig> = {};
  const server: Partial<ZentaoConfig['server']> = {};

  if (process.env.ZENTAO_URL) server.url = process.env.ZENTAO_URL;
  if (process.env.ZENTAO_USERNAME) server.username = process.env.ZENTAO_USERNAME;
  if (process.env.ZENTAO_PASSWORD) server.password = process.env.ZENTAO_PASSWORD;
  if (process.env.ZENTAO_CODE) server.code = process.env.ZENTAO_CODE;
  if (process.env.ZENTAO_TOKEN) server.token = process.env.ZENTAO_TOKEN;

  if (Object.keys(server).length > 0) {
    config.server = server as ZentaoConfig['server'];
  }

  return config;
}

/**
 * 合并配置：环境变量 > 项目配置 > 用户配置 > 默认值
 */
function mergeConfigs(...configs: (Partial<ZentaoConfig> | null)[]): ZentaoConfig {
  const result = structuredClone(DEFAULTS);

  for (const config of configs) {
    if (!config) continue;
    if (config.server) {
      Object.assign(result.server, config.server);
    }
    if (config.output) {
      Object.assign(result.output, config.output);
    }
  }

  return result;
}

/**
 * 推断认证模式
 */
function detectAuthMode(config: ZentaoConfig): 'session' | 'apikey' {
  // 优先使用 API Key 模式
  if (config.server.code && config.server.token) {
    return 'apikey';
  }
  // 否则使用 Session 模式
  if (config.server.username && config.server.password) {
    return 'session';
  }
  // 只有 URL，等待运行时补充凭据
  return 'session';
}

/**
 * 不校验，直接读取原始配置（用于 login 之前读取已有配置）
 */
export function loadRawConfig(): ZentaoConfig {
  const fileConfig = loadConfigFile();
  const envConfig = loadEnvConfig();
  return mergeConfigs(fileConfig, envConfig);
}

/**
 * 加载并校验完整配置
 */
export function loadConfig(): RuntimeConfig {
  const merged = loadRawConfig();

  // 校验
  const parsed = configSchema.safeParse(merged);
  if (!parsed.success) {
    console.error('配置错误:', parsed.error.issues.map(i => i.message).join(', '));
    process.exit(1);
  }

  const finalConfig = parsed.data as ZentaoConfig;
  const authMode = detectAuthMode(finalConfig);

  return {
    ...finalConfig,
    authMode,
    output: finalConfig.output ?? DEFAULTS.output,
  };
}

/**
 * 保存配置到用户目录
 */
export function saveUserConfig(key: string, value: string): void {
  const configDir = path.join(os.homedir(), USER_CONFIG_DIR);
  const configPath = path.join(configDir, USER_CONFIG_FILE);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  let config: Record<string, unknown> = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      // ignore
    }
  }

  // 支持点号路径如 'server.url'
  const keys = key.split('.');
  let current: Record<string, unknown> = config;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  console.log(`配置已保存: ${key} = ${value}`);
}

/**
 * 清除用户配置
 */
export function clearUserConfig(): void {
  const configPath = path.join(os.homedir(), USER_CONFIG_DIR, USER_CONFIG_FILE);

  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
    console.log('配置已清除');
  } else {
    console.log('没有保存的配置');
  }
}