// 默认配置

import { ZentaoConfig } from '../types/config';

export const DEFAULTS: ZentaoConfig = {
  server: {
    url: '',
  },
  output: {
    format: 'table',
    color: true,
  },
};

// 配置文件搜索路径
export const CONFIG_FILE_NAMES = [
  '.chandao4.config.json',
  '.chandao4.json',
  '.zentao.config.json',
  '.zentao.json',
];

// 用户级配置文件路径（~/.chandao4/config.json）
export const USER_CONFIG_DIR = '.chandao4';
export const USER_CONFIG_FILE = 'config.json';