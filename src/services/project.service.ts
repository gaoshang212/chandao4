// Project 业务逻辑 - JSON API

import { ApiClient } from '../core/api-client';

export interface Project {
  id: number;
  name: string;
  code: string;
  status: string;
  begin: string;
  end: string;
}

export class ProjectService {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  async getList(productId?: number): Promise<{ projects: Project[]; total: number }> {
    const data = productId
      ? await this.client.getJson(`/product-project-all-${productId}-0.json`)
      : await this.client.getJson('/project-all.json');
    const projects: Project[] = [];

    if (productId && data.projectStats) {
      const projectStats = Array.isArray(data.projectStats)
        ? data.projectStats
        : Object.values(data.projectStats);

      for (const project of projectStats) {
        const p = project as Record<string, unknown>;
        projects.push({
          id: parseInt(String(p.id), 10),
          name: String(p.name || ''),
          code: String(p.code || ''),
          status: String(p.status || ''),
          begin: String(p.begin || ''),
          end: String(p.end || ''),
        });
      }
    } else if (data.projects) {
      for (const [id, name] of Object.entries(data.projects)) {
        projects.push({ id: parseInt(id, 10), name: name as string, code: '', status: '', begin: '', end: '' });
      }
    }
    return { projects, total: projects.length };
  }

  async getDetail(id: number): Promise<Project | null> {
    const data = await this.client.getJson(`/project-view-${id}.json`);
    if (!data.project) return null;
    const p = data.project;
    return {
      id: parseInt(p.id, 10),
      name: p.name,
      code: p.code || '',
      status: p.status || '',
      begin: p.begin || '',
      end: p.end || '',
    };
  }
}
