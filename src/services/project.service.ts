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

  async getList(): Promise<{ projects: Project[]; total: number }> {
    const data = await this.client.getJson('/project-all.json');
    const projects: Project[] = [];

    if (data.projects) {
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