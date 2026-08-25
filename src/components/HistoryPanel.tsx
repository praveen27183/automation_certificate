import { History, Download, RotateCcw } from 'lucide-react';
import { useApp } from '@/state/AppContext';
import { Button, Card, SectionTitle, Badge } from '@/components/ui';
import { downloadBytes } from '@/lib/download';
import JSZip from 'jszip';
import { downloadBlob } from '@/lib/download';

export function HistoryPanel() {
  const { results, csv } = useApp();
  const success = results.filter((r) => r.status === 'success');

  const downloadZip = async () => {
    const zip = new JSZip();
    for (const r of success) if (r.bytes) zip.file(r.filename, r.bytes);
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `Generated_PDFs_${new Date().toISOString().slice(0, 10)}.zip`);
  };

  return (
    <div>
      <SectionTitle title="History" subtitle="Previously generated PDFs from this session." icon={<History className="w-5 h-5" />} />
      {results.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          <History className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          No generation history yet. Generate PDFs to see them here.
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-4">
                <div><div className="text-xl font-bold text-slate-900">{results.length}</div><div className="text-xs text-slate-500">Total</div></div>
                <div><div className="text-xl font-bold text-emerald-600">{success.length}</div><div className="text-xs text-slate-500">Successful</div></div>
                <div><div className="text-xl font-bold text-red-600">{results.length - success.length}</div><div className="text-xs text-slate-500">Failed</div></div>
              </div>
              {success.length > 0 && <Button icon={<Download className="w-4 h-4" />} onClick={downloadZip}>Download All (.ZIP)</Button>}
            </div>
          </Card>
          <Card className="p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">#</th>
                    {csv?.columns.slice(0, 3).map((c) => <th key={c} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">{c}</th>)}
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
                      <td className="px-3 py-2">{r.status === 'success' ? <Badge color="green">Success</Badge> : <Badge color="red">Failed</Badge>}</td>
                      <td className="px-3 py-2 text-right">
                        {r.status === 'success' && r.bytes ? (
                          <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />} onClick={() => downloadBytes(r.bytes!, r.filename)}>Download</Button>
                        ) : <span className="text-xs text-red-600">{r.error}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
