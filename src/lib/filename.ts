import type { CsvData } from './csv';

const INVALID_CHARS = /[\\/:*?"<>|]/g;

export function sanitizeFilename(name: string): string {
  return name
    .replace(INVALID_CHARS, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .trim();
}

export function buildFilename(template: string, columns: string[], row: string[]): string {
  let name = template;
  columns.forEach((col, idx) => {
    const value = row[idx] ?? '';
    name = name.split(`{{${col}}}`).join(value);
  });
  // Remove any unresolved placeholders
  name = name.replace(/\{\{[^}]+\}\}/g, '').trim();
  const clean = sanitizeFilename(name);
  return clean ? `${clean}.pdf` : 'document.pdf';
}
