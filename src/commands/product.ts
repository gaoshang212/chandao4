// Product 辅助命令

import { Command } from 'commander';
import chalk from 'chalk';
import { ProductService } from '../services/product.service';
import { formatProductTable, formatJson } from '../utils/format';

export function createProductCommand(productService: ProductService, getUseJson: () => boolean): Command {
  const product = new Command('product')
    .description('产品查询');

  product.command('list')
    .description('列出所有产品')
    .option('-l, --limit <n>', '每页条数（客户端分页）', (v) => parseInt(v, 10), 0)
    .option('--page <n>', '页码', (v) => parseInt(v, 10), 1)
    .action(async (options) => {
      try {
        const { products, total } = await productService.getList();
        // 客户端分页
        const limit = options.limit || 0;
        const page = options.page || 1;
        const paged = limit > 0
          ? products.slice((page - 1) * limit, page * limit)
          : products;

        if (getUseJson()) {
          console.log(formatJson(paged));
        } else {
          console.log(formatProductTable(paged));
          const pageInfo = limit ? `第 ${page} 页，共 ${total} 条` : `共 ${total} 条`;
          console.log(chalk.gray(`\n${pageInfo}`));
        }
      } catch (err) {
        process.exit(1);
      }
    });

  return product;
}