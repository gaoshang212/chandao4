// 附件解析：把禅道详情接口返回的 files 节点转成统一 Attachment 列表

import { Attachment } from '../types/models';

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg']);

export function resolveFileUrl(filePath: string, baseUrl: string): string {
  const value = filePath.trim();
  if (!value) throw new Error('图片或文件路径不能为空');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    let base: URL;
    try {
      base = new URL(baseUrl);
    } catch {
      throw new Error('请先配置有效的 server.url，再解析相对路径');
    }
    base.pathname = base.pathname.replace(/\/$/, '') + '/';
    base.search = '';
    base.hash = '';
    try {
      url = new URL(value, base);
    } catch {
      throw new Error('图片或文件路径无效');
    }
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('文件地址仅支持 HTTP 或 HTTPS');
  if (url.username || url.password) throw new Error('文件地址不能包含用户名或密码');
  return url.href;
}

/**
 * 根据扩展名生成访问 URL：图片走 file-read 直链（浏览器/markdown 可直显），
 * 其他类型走 file-download.html。
 */
function buildFileUrl(baseUrl: string, id: number, extension: string, isImage: boolean): string {
  if (isImage && extension) return `${baseUrl}/file-read-${id}.${extension}`;
  return `${baseUrl}/file-download-${id}.html`;
}

export function parseAttachments(rawFiles: unknown, baseUrl: string): Attachment[] {
  if (!rawFiles || typeof rawFiles !== 'object') return [];
  const list: Attachment[] = [];
  for (const [key, raw] of Object.entries(rawFiles as Record<string, any>)) {
    if (!raw || typeof raw !== 'object') continue;
    const id = parseInt(String(raw.id ?? key), 10);
    if (!Number.isFinite(id) || id <= 0) continue;
    const extension = String(raw.extension || '').toLowerCase();
    const title = String(raw.title || raw.pathname || `file-${id}`);
    const isImage = IMAGE_EXT.has(extension);
    list.push({
      id,
      title,
      extension,
      size: parseInt(String(raw.size ?? 0), 10) || 0,
      addedBy: raw.addedBy || undefined,
      addedDate: raw.addedDate || undefined,
      isImage,
      downloadUrl: buildFileUrl(baseUrl, id, extension, isImage),
    });
  }
  list.sort((a, b) => a.id - b.id);
  return list;
}

/**
 * 从富文本（steps / desc / comment 等）里抽取内联的图片或附件引用。
 * 兼容 /file-read-{id}.{ext}、/file-download-{id}.html、以及绝对地址。
 */
export function extractInlineAttachments(text: string, baseUrl: string): Attachment[] {
  if (!text || typeof text !== 'string') return [];
  const found = new Map<number, Attachment>();

  // /file-read-12345.png  (内联图片，大概率是图)
  const readRe = /file-read-(\d+)(?:\.([a-zA-Z0-9]+))?/g;
  let m: RegExpExecArray | null;
  while ((m = readRe.exec(text))) {
    const id = parseInt(m[1], 10);
    if (!Number.isFinite(id) || id <= 0) continue;
    const extension = (m[2] || '').toLowerCase();
    if (!found.has(id)) {
      const isImage = extension ? IMAGE_EXT.has(extension) : true;
      found.set(id, {
        id,
        title: extension ? `inline-${id}.${extension}` : `inline-${id}`,
        extension,
        size: 0,
        isImage,
        downloadUrl: buildFileUrl(baseUrl, id, extension, isImage),
      });
    }
  }

  // /file-download-12345(.html|.ext|.json|无后缀)
  const dlRe = /file-download-(\d+)(?:\.([a-zA-Z0-9]+))?/g;
  while ((m = dlRe.exec(text))) {
    const id = parseInt(m[1], 10);
    if (!Number.isFinite(id) || id <= 0) continue;
    if (!found.has(id)) {
      const ext = (m[2] || '').toLowerCase();
      const realExt = ext === 'html' || ext === 'json' ? '' : ext;
      const isImage = realExt ? IMAGE_EXT.has(realExt) : false;
      found.set(id, {
        id,
        title: realExt ? `inline-${id}.${realExt}` : `inline-${id}`,
        extension: realExt,
        size: 0,
        isImage,
        downloadUrl: buildFileUrl(baseUrl, id, realExt, isImage),
      });
    }
  }

  return Array.from(found.values()).sort((a, b) => a.id - b.id);
}

/**
 * 合并接口 files 节点 + 富文本内联引用。
 * 接口 files 里的元数据优先（有 title/size/addedBy），内联补漏。
 */
export function mergeAttachments(primary: Attachment[], inline: Attachment[]): Attachment[] {
  const seen = new Map<number, Attachment>();
  for (const a of primary) seen.set(a.id, a);
  for (const a of inline) if (!seen.has(a.id)) seen.set(a.id, a);
  return Array.from(seen.values()).sort((a, b) => a.id - b.id);
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
