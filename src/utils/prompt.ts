// 交互式用户输入

import * as readline from 'readline';
import chalk from 'chalk';

/**
 * 询问用户确认
 */
export function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${chalk.yellow('?')} ${message} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * 询问用户输入
 */
export function prompt(message: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const promptMsg = defaultValue
    ? `${chalk.cyan('?')} ${message} [${defaultValue}]: `
    : `${chalk.cyan('?')} ${message}: `;

  return new Promise((resolve) => {
    rl.question(promptMsg, (answer) => {
      rl.close();
      resolve(answer || defaultValue || '');
    });
  });
}

/**
 * 询问密码（不回显）
 */
export function promptPassword(message: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    const promptText = `${chalk.cyan('?')} ${message}: `;

    stdout.write(promptText);

    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }

    let password = '';
    let buf = Buffer.alloc(0);

    const redraw = () => {
      const stars = '*'.repeat(password.length);
      // \r moves to line start, trailing space clears any echoed char, second \r repositions cursor
      stdout.write(`\r${promptText}${stars} \r${promptText}${stars}`);
    };

    const onData = (char: Buffer) => {
      buf = Buffer.concat([buf, char]);

      let processed = 0;
      while (processed < buf.length) {
        const byte = buf[processed];
        let charLen: number;

        if ((byte & 0x80) === 0) charLen = 1;
        else if ((byte & 0xE0) === 0xC0) charLen = 2;
        else if ((byte & 0xF0) === 0xE0) charLen = 3;
        else if ((byte & 0xF8) === 0xF0) charLen = 4;
        else { processed++; continue; }

        if (processed + charLen > buf.length) break;

        const charStr = buf.slice(processed, processed + charLen).toString();
        processed += charLen;

        if (charStr === '\r' || charStr === '\n') {
          stdout.write('\n');
          stdin.removeListener('data', onData);
          if (stdin.isTTY) stdin.setRawMode(false);
          rl.close();
          resolve(password);
          return;
        }
        if (charStr === '\b' || charStr === '\x7f') {
          if (password.length > 0) {
            password = password.slice(0, -1);
            redraw();
          }
          continue;
        }
        if (charStr === '\x03') {
          stdout.write('\n');
          stdin.removeListener('data', onData);
          if (stdin.isTTY) stdin.setRawMode(false);
          rl.close();
          process.exit(0);
        }
        password += charStr;
        redraw();
      }

      buf = buf.slice(processed);
    };

    stdin.on('data', onData);
  });
}