// Product 业务逻辑 - JSON API

import { ApiClient } from '../core/api-client';
import { Product } from '../types/models';

export class ProductService {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /** 获取产品列表 */
  async getList(): Promise<{ products: Product[]; total: number }> {
    const data = await this.client.getJson('/product-all.json');
    const products: Product[] = [];

    if (data.products) {
      for (const [id, name] of Object.entries(data.products)) {
        products.push({ id: parseInt(id, 10), name: name as string, code: '', status: '' });
      }
    }
    // productStats 有更详细的信息
    if (data.productStats) {
      for (const p of data.productStats) {
        const existing = products.find(x => x.id === parseInt(p.id, 10));
        if (existing) {
          existing.code = p.code || '';
          existing.status = p.status || '';
        }
      }
    }

    return { products, total: products.length };
  }

  async getDetail(id: number): Promise<Product | null> {
    const data = await this.client.getJson(`/product-view-${id}.json`);
    if (!data.product) return null;
    return {
      id: parseInt(data.product.id, 10),
      name: data.product.name,
      code: data.product.code || '',
      status: data.product.status || '',
    };
  }
}