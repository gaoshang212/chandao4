import { Command } from 'commander';
import { loadRawConfig } from '../config/config';
import { resolveFileUrl } from '../utils/attachment';
import { formatJson } from '../utils/format';

export function createGetUrlCommand(getUseJson: () => boolean): Command {
  return new Command('get-url')
    .argument('<path>', '图片或文件路径')
    .description('将图片或文件路径转换为完整 URL（无需登录）')
    .action((filePath: string) => {
      try {
        const url = resolveFileUrl(filePath, loadRawConfig().server.url);
        console.log(getUseJson() ? formatJson({ url }) : url);
      } catch (error) {
        console.error(`错误: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
      }
    });
}
