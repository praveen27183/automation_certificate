import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, FileText, Trash2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileCheck2 } from 'lucide-react';
import { useApp } from '@/state/AppContext';
import { Button, Card, SectionTitle } from '@/components/ui';
import { formatBytes, downloadBytes } from '@/lib/download';
import type { PdfMeta } from '@/types';
import * as pdfjsLib from 'pdfjs-dist';

export function TemplateStep() {
  const { pdf, setPdf, setStep } = useApp();
  const [dragOver, setDragOver] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(1);
  const [previews, setPreviews] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file || file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a valid PDF file.');
      return;
    }
    const buf = await file.arrayBuffer();
    let pageCount = 1;
    try {
      const doc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
      pageCount = doc.numPages;
      await doc.cleanup();
    } catch (e) {
      console.warn('page count failed', e);
    }
    setPdf({ name: file.name, size: file.size, pageCount, bytes: buf });
    setPage(1);
    setZoom(1);
  }, [setPdf]);

  // Render previews
  useEffect(() => {
    if (!pdf) {
      setPreviews([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const doc = await pdfjsLib.getDocument({ data: pdf.bytes.slice(0) }).promise;
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
        if (!cancelled) setPreviews(urls);
        await doc.cleanup();
      } catch (e) {
        console.warn('preview render failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [pdf]);

  const previewsLen = previews.length;

  return (
    <div>
      <SectionTitle title="Upload PDF Template" subtitle="Drag & drop or browse to upload a PDF template with placeholders." icon={<FileText className="w-5 h-5" />} />

      {!pdf ? (
        <Card className="p-8">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'}`}
          >
            <Upload className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <p className="text-slate-700 font-medium">Drag & drop your PDF here</p>
            <p className="text-sm text-slate-500 mt-1">or</p>
            <Button className="mt-3" icon={<FileText className="w-4 h-4" />} onClick={() => inputRef.current?.click()}>
              Browse PDF
            </Button>
            <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
            <p className="text-xs text-slate-400 mt-4">The original PDF remains unchanged. All processing is local.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FileCheck2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{pdf.name}</p>
                  <p className="text-sm text-slate-500">{formatBytes(pdf.size)} • {pdf.pageCount} page{pdf.pageCount > 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadBytes(pdf.bytes, pdf.name)}>Download Original</Button>
                <Button variant="secondary" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => setPdf(null)}>Remove</Button>
                <label>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer">
                    <Upload className="w-4 h-4" /> Replace
                  </span>
                  <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
                </label>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Preview</h3>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" icon={<ZoomOut className="w-4 h-4" />} onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} />
                <span className="text-sm text-slate-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="sm" icon={<ZoomIn className="w-4 h-4" />} onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))} />
              </div>
            </div>
            <div className="flex justify-center bg-slate-50 rounded-lg p-4 min-h-[400px] overflow-auto">
              {previewsLen > 0 ? (
                <img src={previews[page - 1]} alt={`Page ${page}`} style={{ width: `${zoom * 100}%`, maxWidth: 'none' }} className="shadow-md rounded transition-all" />
              ) : (
                <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Rendering preview…</div>
              )}
            </div>
            {previewsLen > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <Button variant="outline" size="sm" icon={<ChevronLeft className="w-4 h-4" />} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                <span className="text-sm text-slate-600">Page {page} of {previewsLen}</span>
                <Button variant="outline" size="sm" disabled={page >= previewsLen} onClick={() => setPage((p) => Math.min(previewsLen, p + 1))}>Next<ChevronRight className="w-4 h-4" /></Button>
              </div>
            )}
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => setStep('csv')}>Continue to CSV →</Button>
          </div>
        </div>
      )}
    </div>
  );
}
