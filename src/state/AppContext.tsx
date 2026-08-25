import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  PdfMeta,
  CsvData,
  MappingItem,
  GenerationSettings,
  CustomFont,
  GenResultRow,
  StepId,
} from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { loadProject, saveProject, clearProject } from '@/lib/storage';
import { parseCsv, SAMPLE_CSV } from '@/lib/csv';

interface AppState {
  step: StepId;
  setStep: (s: StepId) => void;

  pdf: PdfMeta | null;
  setPdf: (p: PdfMeta | null) => void;

  csv: CsvData | null;
  setCsv: (c: CsvData | null) => void;

  mappings: MappingItem[];
  setMappings: (m: MappingItem[]) => void;

  settings: GenerationSettings;
  setSettings: (s: GenerationSettings) => void;

  fonts: CustomFont[];
  addFont: (f: CustomFont) => void;
  removeFont: (id: string) => void;

  results: GenResultRow[];
  setResults: (r: GenResultRow[]) => void;

  loadSample: () => Promise<void>;
  reset: () => void;
  exportConfig: () => void;
  importConfig: (file: File) => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp must be inside AppProvider');
  return c;
}

let idCounter = 0;
export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<StepId>('template');
  const [pdf, setPdf] = useState<PdfMeta | null>(null);
  const [csv, setCsv] = useState<CsvData | null>(null);
  const [mappings, setMappings] = useState<MappingItem[]>([]);
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);
  const [fonts, setFonts] = useState<CustomFont[]>([]);
  const [results, setResults] = useState<GenResultRow[]>([]);

  // Load persisted config on mount (without binary pdf)
  useEffect(() => {
    const saved = loadProject();
    if (saved) {
      setCsv(saved.csv);
      setMappings(saved.mappings);
      setSettings({ ...DEFAULT_SETTINGS, ...saved.settings });
    }
  }, []);

  // Persist config (without binary pdf/fonts)
  useEffect(() => {
    saveProject({
      version: 1,
      pdfName: pdf?.name,
      csv,
      mappings,
      settings,
      fonts: fonts.map((f) => ({ id: f.id, name: f.name })),
    });
  }, [pdf, csv, mappings, settings, fonts]);

  const addFont = (f: CustomFont) => setFonts((prev) => [...prev, f]);
  const removeFont = (id: string) => setFonts((prev) => prev.filter((f) => f.id !== id));

  const loadSample = async () => {
    const { buildSamplePdf } = await import('@/lib/sample');
    const bytes = await buildSamplePdf();
    setPdf({ name: 'Lepto_Tech_Internship_Certificate.pdf', size: bytes.byteLength, pageCount: 1, bytes });
    setCsv(parseCsv(SAMPLE_CSV));
    setMappings([
      { id: uid('m'), find: '{{PERSON}}', column: 'PERSON', page: { kind: 'all' }, alignment: 'left', fontSizeMode: 'auto', fontSize: 14, fontKey: 'original', fontWeight: 'normal', color: '#000000' },
      { id: uid('m'), find: '{{COLLEGE}}', column: 'COLLEGE', page: { kind: 'all' }, alignment: 'left', fontSizeMode: 'auto', fontSize: 14, fontKey: 'original', fontWeight: 'normal', color: '#000000' },
      { id: uid('m'), find: '{{COURSE}}', column: 'COURSE', page: { kind: 'all' }, alignment: 'left', fontSizeMode: 'auto', fontSize: 14, fontKey: 'original', fontWeight: 'normal', color: '#000000' },
      { id: uid('m'), find: '{{CERTIFICATE_ID}}', column: 'CERTIFICATE_ID', page: { kind: 'all' }, alignment: 'left', fontSizeMode: 'auto', fontSize: 14, fontKey: 'original', fontWeight: 'normal', color: '#000000' },
      { id: uid('m'), find: '{{DATE}}', column: 'DATE', page: { kind: 'all' }, alignment: 'left', fontSizeMode: 'auto', fontSize: 14, fontKey: 'original', fontWeight: 'normal', color: '#000000' },
    ]);
    setSettings((s) => ({ ...s, filenameTemplate: '{{CERTIFICATE_ID}}_{{PERSON}}' }));
    setResults([]);
    setStep('template');
  };

  const reset = () => {
    clearProject();
    setPdf(null);
    setCsv(null);
    setMappings([]);
    setSettings(DEFAULT_SETTINGS);
    setFonts([]);
    setResults([]);
    setStep('template');
  };

  const exportConfig = () => {
    const config = {
      version: 1,
      pdfName: pdf?.name,
      csv,
      mappings,
      settings,
      fonts: fonts.map((f) => ({ id: f.id, name: f.name })),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pdf-replacer-project.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const importConfig = async (file: File) => {
    const text = await file.text();
    const config = JSON.parse(text);
    if (config.csv) setCsv(config.csv);
    if (config.mappings) setMappings(config.mappings);
    if (config.settings) setSettings({ ...DEFAULT_SETTINGS, ...config.settings });
  };

  const value = useMemo<AppState>(
    () => ({
      step, setStep,
      pdf, setPdf,
      csv, setCsv,
      mappings, setMappings,
      settings, setSettings,
      fonts, addFont, removeFont,
      results, setResults,
      loadSample, reset, exportConfig, importConfig,
    }),
    [step, pdf, csv, mappings, settings, fonts, results]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
