import { useEffect, useRef, useState } from 'react';
import { Eye, ChevronLeft, ChevronRight, ArrowRight, Loader2 } from 'lucide-react';
import { useApp } from '@/state/AppContext';
import { Button, Card, SectionTitle, Badge } from '@/components/ui';
import { extractText, generateOne, type TextItem } from '@/lib/pdf';
import * as pdfjsLib from 'pdfjs-dist';

export function PreviewStep() {
  const { pdf, csv, mappings, settings, fonts, setStep } = useApp();
  const [recordIdx, setRecordIdx] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<TextItem[][] | null>(null);
  const [page, setPage] = useState(1);
  const [pageUrls, setPageUrls] = useState<string[]>([]);
  const renderTaskRef = useRef(0);

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    extractText(pdf.bytes).then((p) => { if (!cancelled) setPages(p); }).catch((e) => console.warn(e));
    return () => { cancelled = true; };
  }, [pdf]);

  useEffect(() => {
    if (!pdf || !csv || !pages || mappings.length === 0) {
      setPreviewUrl(null);
      setPageUrls([]);
      return;
    }
    const row = csv.rows[recordIdx];
    if (!row) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const taskId = ++renderTaskRef.current;
    (async () => {
      try {
        const bytes = await generateOne(pdf.bytes, pages, mappings, csv.columns, row, settings, fonts);
        if (cancelled || taskId !== renderTaskRef.current) return;
        const doc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
        const urls: string[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) break;
          const pg = await doc.getPage(i);
          const viewport = pg.getViewport({ scale: 1.2 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d')!;
          await pg.render({ canvas, canvasContext: ctx, viewport }).promise;
          urls.push(canvas.toDataURL('image/png'));
        }
        await doc.cleanup();
        if (!cancelled && taskId === renderTaskRef.current) {
          setPageUrls(urls);
          setPreviewUrl(urls[0] ?? null);
          setPage(1);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Preview failed');
      } finally {
        if (!cancelled && taskId === renderTaskRef.current) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pdf, csv, pages, mappings, recordIdx, settings, fonts]);

  if (!pdf || !csv || mappings.length === 0) {
    return (
      <div>
        <SectionTitle title="Preview" subtitle="Configure mappings first." icon={<Eye className="w-5 h-5" />} />
        <Card className="p-8 text-center text-slate-500">Upload a PDF, CSV, and add at least one mapping to preview.</Card>
      </div>
    );
  }

  const row = csv.rows[recordIdx];

  return (
    <div>
      <SectionTitle title="Preview" subtitle="Preview the generated PDF using the selected record." icon={<Eye className="w-5 h-5" />} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Generated Preview</h3>
            <Badge color="blue">Record {recordIdx + 1} of {csv.rows.length}</Badge>
          </div>
          <div className="flex justify-center bg-slate-50 rounded-lg p-4 min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="text-sm">Generating preview…</span>
              </div>
            ) : error ? (
              <div className="text-red-600 text-sm text-center max-w-sm">{error}</div>
            ) : previewUrl ? (
              <img src={pageUrls[page - 1] ?? previewUrl} alt="Preview" className="shadow-md rounded max-h-[600px]" />
            ) : (
              <div className="text-slate-400 text-sm">No preview</div>
            )}
          </div>
          {pageUrls.length > 1 && !loading && (
            <div className="flex items-center justify-center gap-3 mt-3">
              <Button variant="outline" size="sm" icon={<ChevronLeft className="w-4 h-4" />} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <span className="text-sm text-slate-600">Page {page} of {pageUrls.length}</span>
              <Button variant="outline" size="sm" disabled={page >= pageUrls.length} onClick={() => setPage((p) => p + 1)}>Next<ChevronRight className="w-4 h-4" /></Button>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Replacement Summary</h3>
          <div className="space-y-3">
            {mappings.map((m) => {
              const colIdx = csv.columns.indexOf(m.column);
              const val = colIdx >= 0 ? row?.[colIdx] ?? '' : '';
              return (
                <div key={m.id} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 text-xs">{m.find}</code>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                    <span className="font-medium text-slate-900">{val || <span className="text-slate-400 italic">empty</span>}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Column: {m.column}</div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-5">
            <Button variant="outline" size="sm" icon={<ChevronLeft className="w-4 h-4" />} disabled={recordIdx === 0} onClick={() => setRecordIdx((i) => i - 1)}>Previous</Button>
            <span className="text-sm text-slate-600">{recordIdx + 1} / {csv.rows.length}</span>
            <Button variant="outline" size="sm" disabled={recordIdx >= csv.rows.length - 1} onClick={() => setRecordIdx((i) => i + 1)}>Next<ChevronRight className="w-4 h-4" /></Button>
          </div>
        </Card>
      </div>

      <div className="flex justify-between mt-4">
        <Button variant="secondary" onClick={() => setStep('mapping')}>← Back to Mapping</Button>
        <Button onClick={() => setStep('generate')}>Continue to Generate →</Button>
      </div>
    </div>
  );
}
