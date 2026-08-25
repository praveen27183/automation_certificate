import type { ProjectConfig } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

const KEY = 'pdfbr-pro:project:v1';

export function saveProject(config: ProjectConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('saveProject failed', e);
  }
}

export function loadProject(): ProjectConfig | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProjectConfig;
    if (!parsed.version) return null;
    parsed.settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
    return parsed;
  } catch {
    return null;
  }
}

export function clearProject() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
