// 配置类型定义

export interface ServerConfig {
  url: string;           // 禅道服务器 URL
  username?: string;     // 用户名（Session 模式）
  password?: string;     // 密码（Session 模式）
  code?: string;         // API Code（API Key 模式）
  token?: string;        // API Token（API Key 模式）
}

export interface OutputConfig {
  format: 'table' | 'json';  // 输出格式
  color: boolean;              // 是否使用颜色
}

export interface ZentaoConfig {
  server: ServerConfig;
  output: OutputConfig;
}

// 运行时配置（包含运行时状态）
export interface RuntimeConfig extends ZentaoConfig {
  authMode: 'session' | 'apikey';  // 当前认证模式
}