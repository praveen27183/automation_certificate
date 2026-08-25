import { useRef, useState } from 'react';
import { Zap, Download, Loader2, CheckCircle2, XCircle, AlertTriangle, RotateCcw, FileDown, Check, X } from 'lucide-react';
import JSZip from 'jszip';
import { useApp } from '@/state/AppContext';
import { Button, Card, SectionTitle, Badge } from '@/components/ui';
import { extractText, generateOne, type TextItem } from '@/lib/pdf';
import { buildFilename } from '@/lib/filename';
import { downloadBlob, downloadBytes } from '@/lib/download';
import type { GenResultRow } from '@/types';

export function GenerateStep() {
  const { pdf, csv, mappings, settings, fonts, results, setResults, setStep } = useApp();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [validation, setValidation] = useState<{ ok: boolean; items: { label: string; ok: boolean; msg?: string }[] } | null>(null);
  const cancelRef = useRef(false);

  const total = csv?.rows.length ?? 0;

  const validate = (): { ok: boolean; items: { label: string; ok: boolean; msg?: string }[] } => {
    const items: { label: string; ok: boolean; msg?: string }[] = [];
    items.push({ label: 'PDF loaded', ok: !!pdf });
    items.push({ label: 'CSV loaded', ok: !!csv, msg: csv ? `${csv.rows.length} records` : undefined });
    items.push({ label: 'CSV columns detected', ok: !!csv && csv.columns.length > 0, msg: csv ? `${csv.columns.length} columns` : undefined });
    items.push({ label: 'Mappings configured', ok: mappings.length > 0, msg: `${mappings.length} mappings` });
    if (mappings.length > 0 && csv) {
      const missing = mappings.filter((m) => !csv.columns.includes(m.column));
      items.push({ label: 'Mapping columns valid', ok: missing.length === 0, msg: missing.length ? `Missing: ${missing.map((m) => m.column).join(', ')}` : undefined });
    }
    items.push({ label: 'Filename template valid', ok: !!settings.filenameTemplate && /{{.+}}/.test(settings.filenameTemplate), msg: settings.filenameTemplate });
    const allOk = items.every((i) => i.ok);
    return { ok: allOk, items };
  };

  const runValidation = () => setValidation(validate());

  const generate = async () => {
    if (!pdf || !csv || mappings.length === 0) return;
    const v = validate();
    setValidation(v);
    if (!v.ok) return;

    setRunning(true);
    setProgress(0);
    setResults([]);
    cancelRef.current = false;

    let pages: TextItem[][];
    try {
      pages = await extractText(pdf.bytes);
    } catch (e: any) {
      setValidation({ ok: false, items: [{ label: 'PDF text extraction', ok: false, msg: e?.message }] });
      setRunning(false);
      return;
    }

    const batch = Math.max(1, settings.batchSize);
    const out: GenResultRow[] = [];
    const templateBytes = pdf.bytes;

    for (let i = 0; i < csv.rows.length; i++) {
      if (cancelRef.current) break;
      const row = csv.rows[i];
      const filename = buildFilename(settings.filenameTemplate, csv.columns, row);
      setCurrentFile(filename);
      try {
        const bytes = await generateOne(templateBytes, pages, mappings, csv.columns, row, settings, fonts);
        out.push({ index: i + 1, row, filename, status: 'success', bytes });
      } catch (e: any) {
        out.push({ index: i + 1, row, filename, status: 'failed', error: e?.message || 'Unknown error' });
      }
      setProgress(i + 1);
      if ((i + 1) % batch === 0) {
        setResults([...out]);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    setResults([...out]);
    setRunning(false);
    setCurrentFile('');
  };

  const cancel = () => { cancelRef.current = true; };

  const successCount = results.filter((r) => r.status === 'success').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;
  const done = results.length > 0 && !running;
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

  const downloadZip = async () => {
    const zip = new JSZip();
    const ok = results.filter((r) => r.status === 'success' && r.bytes);
    for (const r of ok) zip.file(r.filename, r.bytes!);
    const blob = await zip.generateAsync({ type: 'blob' });
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `Generated_PDFs_${date}.zip`);
  };

  const downloadErrorReport = () => {
    const failed = results.filter((r) => r.status === 'failed');
    const personCol = csv?.columns.indexOf('PERSON') ?? 0;
    const certCol = csv?.columns.indexOf('CERTIFICATE_ID') ?? -1;
    const lines = ['ROW,PERSON,CERTIFICATE_ID,STATUS,ERROR'];
    for (const f of failed) {
      const person = f.row[personCol] ?? '';
      const cert = certCol >= 0 ? f.row[certCol] ?? '' : '';
      const err = (f.error ?? '').replace(/"/g, '""');
      lines.push(`${f.index},"${person}","${cert}",FAILED,"${err}"`);
    }
    downloadBlob(new Blob([lines.join('\n')], { type: 'text/csv' }), 'error_report.csv');
  };

  const retryFailed = async () => {
    if (!pdf || !csv) return;
    const failed = results.filter((r) => r.status === 'failed');
    if (failed.length === 0) return;
    setRunning(true);
    cancelRef.current = false;
    let pages: TextItem[][];
    try { pages = await extractText(pdf.bytes); } catch { setRunning(false); return; }
    const updated = [...results];
    for (const f of failed) {
      if (cancelRef.current) break;
      const row = csv.rows[f.index - 1];
      setCurrentFile(f.filename);
      try {
        const bytes = await generateOne(pdf.bytes, pages, mappings, csv.columns, row, settings, fonts);
        updated[f.index - 1] = { ...f, status: 'success', bytes, error: undefined };
      } catch (e: any) {
        updated[f.index - 1] = { ...f, error: e?.message };
      }
      setResults([...updated]);
    }
    setRunning(false);
    setCurrentFile('');
  };

  if (!pdf || !csv || mappings.length === 0) {
    return (
      <div>
        <SectionTitle title="Generate" subtitle="Complete the previous steps first." icon={<Zap className="w-5 h-5" />} />
        <Card className="p-8 text-center text-slate-500">Upload a PDF, CSV, and add mappings before generating.</Card>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle title="Bulk Generation" subtitle="Generate personalized PDFs for every record in your CSV." icon={<Zap className="w-5 h-5" />} />

      {!running && !done && (
        <Card className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-3xl font-bold text-slate-900">{total}</div>
              <div className="text-sm text-slate-500">records ready to generate</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={runValidation}>Validate</Button>
              <Button size="lg" icon={<Zap className="w-5 h-5" />} onClick={generate}>Generate All PDFs</Button>
            </div>
          </div>
        </Card>
      )}

      {validation && !done && (
        <Card className="p-5 mt-4">
          <h3 className="font-semibold text-slate-900 mb-3">Validation</h3>
          <div className="space-y-2">
            {validation.items.map((it, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {it.ok ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-red-600" />}
                <span className={it.ok ? 'text-slate-700' : 'text-red-700 font-medium'}>{it.label}</span>
                {it.msg && <span className="text-slate-400">— {it.msg}</span>}
              </div>
            ))}
          </div>
          <div className={`mt-3 text-sm font-medium ${validation.ok ? 'text-emerald-700' : 'text-red-700'}`}>
            {validation.ok ? '✓ Ready to Generate' : '✗ Fix the issues above before generating'}
          </div>
        </Card>
      )}

      {running && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <h3 className="font-semibold text-slate-900">Generating PDFs…</h3>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden mb-2">
            <div className="bg-blue-600 h-4 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>{progress} / {total}</span>
            <span className="font-semibold">{pct}%</span>
          </div>
          {currentFile && <p className="text-xs text-slate-500 mt-2 truncate">Current: {currentFile}</p>}
          <div className="mt-4">
            <Button variant="danger" size="sm" onClick={cancel}>Cancel</Button>
          </div>
        </Card>
      )}

      {done && (
        <div className="space-y-4">
          <Card className={`p-6 ${failedCount === 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
            <div className="flex items-center gap-3 mb-2">
              {failedCount === 0 ? <CheckCircle2 className="w-7 h-7 text-emerald-600" /> : <AlertTriangle className="w-7 h-7 text-amber-600" />}
              <div>
                <h3 className="text-xl font-bold text-slate-900">Generation Complete</h3>
                <p className="text-sm text-slate-600">
                  {successCount} / {results.length} PDFs generated successfully{failedCount > 0 && `, ${failedCount} failed`}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4 flex-wrap">
              {successCount > 0 && (
                <Button size="lg" icon={<Download className="w-5 h-5" />} onClick={downloadZip}>
                  Download All PDFs (.ZIP)
                </Button>
              )}
              {successCount > 0 && (
                <Button variant="outline" size="lg" icon={<RotateCcw className="w-5 h-5" />} onClick={downloadZip}>
                  Download All Again
                </Button>
              )}
              {failedCount > 0 && (
                <>
                  <Button variant="outline" size="lg" icon={<RotateCcw className="w-5 h-5" />} onClick={retryFailed}>Retry Failed</Button>
                  <Button variant="outline" size="lg" icon={<FileDown className="w-5 h-5" />} onClick={downloadErrorReport}>Download Error Report</Button>
                </>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Results</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">#</th>
                    {csv.columns.slice(0, 3).map((c) => (
                      <th key={c} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">{c}</th>
                    ))}
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Filename</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.index} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-400">{r.index}</td>
                      {r.row.slice(0, 3).map((c, i) => <td key={i} className="px-3 py-2 truncate max-w-[160px]" title={c}>{c}</td>)}
                      <td className="px-3 py-2 truncate max-w-[200px]" title={r.filename}>{r.filename}</td>
                      <td className="px-3 py-2">
                        {r.status === 'success' ? (
                          <Badge color="green"><CheckCircle2 className="w-3 h-3 mr-1" />Success</Badge>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700" title={r.error}>
                            <XCircle className="w-3.5 h-3.5" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.status === 'success' && r.bytes ? (
                          <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />} onClick={() => downloadBytes(r.bytes!, r.filename)}>Download</Button>
                        ) : r.error ? (
                          <span className="text-xs text-red-600" title={r.error}>{r.error}</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {!running && !done && (
        <div className="flex justify-between mt-4">
          <Button variant="secondary" onClick={() => setStep('preview')}>← Back to Preview</Button>
        </div>
      )}
    </div>
  );
}
