import { useCallback, useEffect, useRef, useState } from 'react';
import { Settings2, Plus, Trash2, Sparkles, Wand2, Type, Upload, Eye, MousePointer2, AlertTriangle } from 'lucide-react';
import { useApp, uid } from '@/state/AppContext';
import { Button, Card, SectionTitle, Badge } from '@/components/ui';
import { extractText, detectPlaceholders, type TextItem } from '@/lib/pdf';
import type { MappingItem, PageSelection } from '@/types';

export function MappingStep() {
  const { pdf, csv, mappings, setMappings, fonts, addFont, setStep } = useApp();
  const [detected, setDetected] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [pages, setPages] = useState<TextItem[][] | null>(null);
  const [mappingMode, setMappingMode] = useState<'auto' | 'manual'>('auto');
  const fontInputRef = useRef<HTMLInputElement>(null);

  const scan = useCallback(async () => {
    if (!pdf) return;
    setScanning(true);
    try {
      const p = await extractText(pdf.bytes);
      setPages(p);
      setDetected(detectPlaceholders(p));
    } catch (e) {
      console.warn('extract failed', e);
      alert('Could not extract text from this PDF. It may be scanned/image-based.');
    } finally {
      setScanning(false);
    }
  }, [pdf]);

  useEffect(() => {
    if (pdf && !pages) scan();
  }, [pdf, pages, scan]);

  const createMapping = (find = '', column = csv?.columns[0] ?? ''): MappingItem => ({
    id: uid('m'),
    find,
    column,
    page: { kind: 'all' },
    alignment: 'left',
    fontSizeMode: 'auto',
    fontSize: 14,
    fontKey: 'original',
    fontWeight: 'normal',
    color: '#000000',
  });

  const addMapping = () => {
    if (!csv || csv.columns.length === 0) return;
    setMappings([...mappings, createMapping()]);
  };

  const updateMapping = (id: string, patch: Partial<MappingItem>) => {
    setMappings(mappings.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const deleteMapping = (id: string) => {
    setMappings(mappings.filter((m) => m.id !== id));
  };

  const autoMapAll = () => {
    if (!csv || detected.length === 0) return;
    const newMaps = detected.flatMap((placeholder) => {
      const inner = placeholder.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase();
      const column = csv.columns.find((candidate) => candidate.trim().toLowerCase() === inner);
      return column ? [createMapping(placeholder, column)] : [];
    });
    const existingFinds = new Set(mappings.map((mapping) => mapping.find.trim().toLowerCase()));
    setMappings([...mappings, ...newMaps.filter((mapping) => !existingFinds.has(mapping.find.trim().toLowerCase()))]);
  };

  const handleFontUpload = async (file: File) => {
    const buf = await file.arrayBuffer();
    const name = file.name.replace(/\.(ttf|otf)$/i, '');
    addFont({ id: uid('font'), name, bytes: buf });
  };

  if (!pdf || !csv) {
    return (
      <div>
        <SectionTitle title="Custom Mapping" subtitle="Upload a PDF and CSV first to configure mappings." icon={<Settings2 className="w-5 h-5" />} />
        <Card className="p-8 text-center text-slate-500">
          Please complete the previous steps first. {!pdf && 'Upload a PDF template. '} {!csv && 'Upload a CSV file.'}
        </Card>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle title="Custom Mapping" subtitle="Map text in the PDF to columns in your CSV." icon={<Settings2 className="w-5 h-5" />} />

      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-semibold text-slate-900">Mapping Mode</h3>
            <p className="text-sm text-slate-500 mt-0.5">Choose automatic placeholder matching or select every CSV column yourself.</p>
          </div>
          <div className="flex rounded-lg border border-slate-300 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setMappingMode('auto')}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${mappingMode === 'auto' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
            >
              <Sparkles className="w-4 h-4" /> Auto
            </button>
            <button
              type="button"
              onClick={() => setMappingMode('manual')}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${mappingMode === 'manual' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
            >
              <MousePointer2 className="w-4 h-4" /> Manual
            </button>
          </div>
        </div>
      </Card>

      {mappingMode === 'auto' && (
        <Card className="p-5 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Sparkles className="w-4 h-4 text-blue-600" /> Placeholder Detection</h3>
              <p className="text-sm text-slate-500 mt-0.5">Scan the PDF for placeholders like {`{{PERSON}}`}.</p>
            </div>
            <Button variant="outline" size="sm" loading={scanning} icon={<Wand2 className="w-4 h-4" />} onClick={scan}>
              {scanning ? 'Scanning…' : 'Detect Placeholders'}
            </Button>
          </div>
          {detected.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-700">Detected placeholders:</p>
                <Button size="sm" icon={<Sparkles className="w-4 h-4" />} onClick={autoMapAll}>Auto Map All</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {detected.map((ph) => <Badge key={ph} color="blue">{ph}</Badge>)}
            </div>
          </div>
          )}
        </Card>
      )}

      {mappingMode === 'manual' && csv.columns.length === 0 && (
        <Card className="p-4 mb-4 border-amber-200 bg-amber-50 text-amber-800 flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Your CSV has no detected column headers. Go back to CSV Data and upload a CSV with a header row first.
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-700">Available CSV columns:</span>
            {csv.columns.length > 0 ? (
              csv.columns.map((c) => <Badge key={c} color="slate">{c}</Badge>)
            ) : (
              <span className="text-sm text-amber-700">No columns detected — go back to CSV Data and upload a CSV with a header row.</span>
            )}
          </div>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={addMapping} disabled={csv.columns.length === 0}>Add Mapping</Button>
        </div>

        {mappings.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Type className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p>No mappings yet. Click "Detect Placeholders" then "Auto Map All", or add a mapping manually.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mappings.map((m) => {
              const colIdx = csv.columns.indexOf(m.column);
              const example = colIdx >= 0 ? csv.rows[0]?.[colIdx] ?? '' : '';
              return (
                <div key={m.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Field label="Find Text / Placeholder">
                      <input value={m.find} onChange={(e) => updateMapping(m.id, { find: e.target.value })} placeholder="{{PERSON}}" className="input" list="detected-list" />
                      <datalist id="detected-list">{detected.map((d) => <option key={d} value={d} />)}</datalist>
                    </Field>
                    <Field label="Replace With (CSV Column)">
                      <select
                        value={csv.columns.includes(m.column) ? m.column : ''}
                        onChange={(e) => updateMapping(m.id, { column: e.target.value })}
                        className="input"
                        disabled={csv.columns.length === 0}
                      >
                        <option value="" disabled>Select a CSV column</option>
                        {csv.columns.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Example">
                      <div className="input bg-white truncate" title={example}>{example || <span className="text-slate-400 italic">Select a CSV column</span>}</div>
                    </Field>
                    <Field label="Page">
                      <PageSelect value={m.page} pdf={pdf} onChange={(p) => updateMapping(m.id, { page: p })} />
                    </Field>
                    <Field label="Alignment">
                      <select value={m.alignment} onChange={(e) => updateMapping(m.id, { alignment: e.target.value as any })} className="input">
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </Field>
                    <Field label="Font">
                      <select value={m.fontKey} onChange={(e) => updateMapping(m.id, { fontKey: e.target.value })} className="input">
                        <option value="original">Original / Detected</option>
                        <option value="helvetica">Helvetica</option>
                        <option value="arial">Arial (Helvetica)</option>
                        <option value="times">Times</option>
                        {fonts.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Font Size">
                      <div className="flex items-center gap-2">
                        <select value={m.fontSizeMode} onChange={(e) => updateMapping(m.id, { fontSizeMode: e.target.value as any })} className="input flex-1">
                          <option value="auto">Auto</option>
                          <option value="custom">Custom</option>
                        </select>
                        {m.fontSizeMode === 'custom' && (
                          <input type="number" min={6} max={96} value={m.fontSize} onChange={(e) => updateMapping(m.id, { fontSize: Number(e.target.value) })} className="input w-20" />
                        )}
                      </div>
                    </Field>
                    <Field label="Font Weight">
                      <select value={m.fontWeight} onChange={(e) => updateMapping(m.id, { fontWeight: e.target.value as any })} className="input">
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                      </select>
                    </Field>
                    <Field label="Text Color">
                      <div className="flex items-center gap-2">
                        <input type="color" value={m.color} onChange={(e) => updateMapping(m.id, { color: e.target.value })} className="w-10 h-9 rounded border border-slate-300 cursor-pointer" />
                        <span className="text-sm text-slate-600 font-mono">{m.color}</span>
                      </div>
                    </Field>
                  </div>
                  <div className="flex justify-end mt-3">
                    <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => deleteMapping(m.id)}>Delete</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 bg-white cursor-pointer">
                <Upload className="w-4 h-4" /> Upload Custom Font (TTF/OTF)
              </span>
              <input ref={fontInputRef} type="file" accept=".ttf,.otf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFontUpload(f); e.target.value = ''; }} />
            </label>
            {fonts.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {fonts.map((f) => <Badge key={f.id} color="slate">{f.name}</Badge>)}
              </div>
            )}
          </div>
          <Button icon={<Eye className="w-4 h-4" />} onClick={() => setStep('preview')} disabled={mappings.length === 0 || mappings.some((m) => !m.find.trim() || !m.column)}>Continue to Preview →</Button>
        </div>
      </Card>

      <style>{`
        .input { padding: 0.5rem 0.75rem; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; width: 100%; background: #fff; outline: none; }
        .input:focus { box-shadow: 0 0 0 2px #3b82f6; border-color: #3b82f6; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function PageSelect({ value, pdf, onChange }: { value: PageSelection; pdf: { pageCount: number }; onChange: (p: PageSelection) => void }) {
  return (
    <select
      value={value.kind === 'page' ? `page_${value.page}` : value.kind === 'range' ? 'range' : 'all'}
      onChange={(e) => {
        const v = e.target.value;
        if (v === 'all') onChange({ kind: 'all' });
        else if (v === 'range') onChange({ kind: 'range', from: 1, to: pdf.pageCount });
        else if (v.startsWith('page_')) onChange({ kind: 'page', page: Number(v.replace('page_', '')) });
      }}
      className="px-3 py-2 text-sm border border-slate-300 rounded-lg w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="all">All Pages</option>
      {Array.from({ length: pdf.pageCount }, (_, i) => <option key={i} value={`page_${i + 1}`}>Page {i + 1}</option>)}
      <option value="range">Custom Range</option>
    </select>
  );
}
