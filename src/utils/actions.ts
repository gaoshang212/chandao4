import { ActionRecord } from '../types/models';
import { extractInlineAttachments } from './attachment';

export function parseActions(rawActions: unknown, baseUrl: string): ActionRecord[] {
  if (!rawActions || typeof rawActions !== 'object') return [];
  const actions: ActionRecord[] = [];
  for (const [key, raw] of Object.entries(rawActions)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const id = Number(raw.id ?? key);
    if (!Number.isSafeInteger(id) || id <= 0) continue;
    const action: ActionRecord = {
      id,
      actor: String(raw.actor ?? ''),
      action: String(raw.action ?? ''),
      date: String(raw.date ?? ''),
      comment: String(raw.comment ?? ''),
      extra: String(raw.extra ?? ''),
      history: [],
    };
    if (raw.history && typeof raw.history === 'object') {
      for (const change of Object.values(raw.history) as any[]) {
        if (!change || typeof change !== 'object' || typeof change.field !== 'string') continue;
        action.history.push({
          field: change.field,
          old: String(change.old ?? ''),
          new: String(change.new ?? ''),
          diff: String(change.diff ?? ''),
        });
      }
    }
    const files = extractInlineAttachments(action.comment, baseUrl);
    if (files.length) action.files = files;
    actions.push(action);
  }
  return actions.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
}
