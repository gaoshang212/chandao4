// 参数校验

/**
 * 校验数字 ID（正整数）
 */
export function isValidId(value: string | number): boolean {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  return Number.isInteger(num) && num > 0;
}

/**
 * 校验 Bug 状态
 */
const VALID_BUG_STATUSES = ['active', 'resolved', 'closed'];
export function isValidBugStatus(status: string): boolean {
  return VALID_BUG_STATUSES.includes(status);
}

/**
 * 校验 Task 状态
 */
const VALID_TASK_STATUSES = ['wait', 'doing', 'done', 'pause', 'cancel', 'closed'];
export function isValidTaskStatus(status: string): boolean {
  return VALID_TASK_STATUSES.includes(status);
}

/**
 * 校验严重程度 (1-4)
 */
export function isValidSeverity(value: string | number): boolean {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  return num >= 1 && num <= 4;
}

/**
 * 校验优先级 (1-4)
 */
export function isValidPriority(value: string | number): boolean {
  return isValidSeverity(value); // 范围相同 1-4
}