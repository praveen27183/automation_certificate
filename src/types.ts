export type StepId = 'template' | 'csv' | 'mapping' | 'preview' | 'generate';

export type ReplacementMode = 'placeholder' | 'findreplace';

export type Alignment = 'left' | 'center' | 'right';

export type FontWeight = 'normal' | 'bold';

export type PageSelection =
  | { kind: 'all' }
  | { kind: 'page'; page: number }
  | { kind: 'range'; from: number; to: number };

export interface MappingItem {
  id: string;
  find: string;
  column: string;
  page: PageSelection;
  alignment: Alignment;
  fontSizeMode: 'auto' | 'custom';
  fontSize: number;
  fontKey: string; // 'original' | 'arial' | 'helvetica' | 'times' | custom id
  fontWeight: FontWeight;
  color: string; // hex
}

export interface CustomFont {
  id: string;
  name: string;
  bytes: ArrayBuffer;
}

export interface PdfMeta {
  name: string;
  size: number;
  pageCount: number;
  bytes: ArrayBuffer;
}

export interface CsvData {
  columns: string[];
  rows: string[][];
}

export interface GenerationSettings {
  mode: ReplacementMode;
  autoFit: boolean;
  minFontSize: number;
  maxFontSize: number;
  preserveOriginal: boolean;
  filenameTemplate: string;
  zipEnabled: boolean;
  individualDownloads: boolean;
  batchSize: number;
  memoryOptimization: boolean;
}

export interface GenResultRow {
  index: number; // 1-based
  row: string[];
  filename: string;
  status: 'success' | 'failed';
  error?: string;
  bytes?: ArrayBuffer;
}

export interface ProjectConfig {
  version: 1;
  pdfName?: string;
  csv: CsvData | null;
  mappings: MappingItem[];
  settings: GenerationSettings;
  fonts: { id: string; name: string }[];
}

export const DEFAULT_SETTINGS: GenerationSettings = {
  mode: 'placeholder',
  autoFit: true,
  minFontSize: 8,
  maxFontSize: 48,
  preserveOriginal: true,
  filenameTemplate: '{{CERTIFICATE_ID}}_{{PERSON}}',
  zipEnabled: true,
  individualDownloads: true,
  batchSize: 10,
  memoryOptimization: false,
};

export const FONT_PRESETS = [
  { key: 'original', label: 'Original / Detected' },
  { key: 'helvetica', label: 'Helvetica' },
  { key: 'times', label: 'Times' },
];
