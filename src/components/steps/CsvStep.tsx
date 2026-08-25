import { useMemo, useRef, useState } from 'react';
import { Table2, Upload, Download, Search, Trash2, Plus, Copy, Pencil, Check, X } from 'lucide-react';
import { useApp } from '@/state/AppContext';
import { Button, Card, SectionTitle, Badge } from '@/components/ui';
import { parseCsv, toCsv, SAMPLE_CSV } from '@/lib/csv';
import { downloadBlob } from '@/lib/download';
import type { CsvData } from '@/lib/csv';

const PAGE_SIZE = 10;

export function CsvStep() {
  const { csv, setCsv, setStep } = useApp();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [editCell, setEditCell] = useState<{ r: number; c: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const data = parseCsv(text);
    if (data.columns.length === 0) {
      alert('Could not parse CSV. Please check the file format.');
      return;
    }
    setCsv(data);
    setPage(0);
    setSearch('');
  };

  const downloadSample = () => {
    downloadBlob(new Blob([SAMPLE_CSV], { type: 'text/csv' }), 'sample.csv');
  };

  const filtered = useMemo(() => {
    if (!csv) return [];
    let rows = csv.rows.map((r, i) => ({ row: r, originalIndex: i }));
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(({ row }) => row.some((c) => c.toLowerCase().includes(q)));
    }
    if (sortCol !== null) {
      rows = [...rows].sort((a, b) => {
        const av = a.row[sortCol] ?? '';
        const bv = b.row[sortCol] ?? '';
        const cmp = av.localeCompare(bv, undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [csv, search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const updateCell = (r: number, c: number, value: string) => {
    if (!csv) return;
    const rows = csv.rows.map((row) => [...row]);
    rows[r][c] = value;
    setCsv({ ...csv, rows });
  };

  const deleteRow = (r: number) => {
    if (!csv) return;
    setCsv({ ...csv, rows: csv.rows.filter((_, i) => i !== r) });
  };

  const duplicateRow = (r: number) => {
    if (!csv) return;
    const rows = [...csv.rows];
    rows.splice(r + 1, 0, [...rows[r]]);
    setCsv({ ...csv, rows });
  };

  const addRow = () => {
    if (!csv) return;
    setCsv({ ...csv, rows: [...csv.rows, new Array(csv.columns.length).fill('')] });
  };

  const toggleSort = (c: number) => {
    if (sortCol === c) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(c); setSortDir('asc'); }
  };

  return (
    <div>
      <SectionTitle title="Upload CSV Data" subtitle="Upload a CSV with your records. You can edit, search, sort, and paginate." icon={<Table2 className="w-5 h-5" />} />

      {!csv ? (
        <Card className="p-8">
          <div
            className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-12 text-center transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >
            <Upload className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <p className="text-slate-700 font-medium">Drag & drop your CSV here</p>
            <p className="text-sm text-slate-500 mt-1">or</p>
            <Button className="mt-3" icon={<Table2 className="w-4 h-4" />} onClick={() => inputRef.current?.click()}>Browse CSV</Button>
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
            <div className="mt-4">
              <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={downloadSample}>Download Sample CSV</Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-2xl font-bold text-slate-900">{csv.rows.length}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Total Records</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{csv.columns.length}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Columns</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={() => downloadBlob(new Blob([toCsv(csv)], { type: 'text/csv' }), 'edited.csv')}>Export CSV</Button>
                <Button variant="secondary" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => setCsv(null)}>Remove</Button>
                <label>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer">
                    <Upload className="w-4 h-4" /> Replace
                  </span>
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
                </label>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  placeholder="Search records…"
                  className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button size="sm" variant="outline" icon={<Plus className="w-4 h-4" />} onClick={addRow}>Add Row</Button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-12">#</th>
                    {csv.columns.map((col, c) => (
                      <th key={c} className="px-3 py-2 text-left">
                        <button onClick={() => toggleSort(c)} className="flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-600">
                          {col}
                          {sortCol === c && <span className="text-blue-500">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                        </button>
                      </th>
                    ))}
                    <th className="px-3 py-2 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(({ row, originalIndex }) => (
                    <tr key={originalIndex} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-400 text-xs">{originalIndex + 1}</td>
                      {row.map((cell, c) => (
                        <td key={c} className="px-3 py-2">
                          {editCell?.r === originalIndex && editCell.c === c ? (
                            <div className="flex items-center gap-1">
                              <input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="px-2 py-1 text-sm border border-blue-500 rounded w-full min-w-[100px]"
                                autoFocus
                              />
                              <button onClick={() => { updateCell(originalIndex, c, editValue); setEditCell(null); }} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Check className="w-4 h-4" /></button>
                              <button onClick={() => setEditCell(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <span
                              className="cursor-text px-1 py-0.5 rounded hover:bg-blue-50 inline-block max-w-[220px] truncate"
                              onClick={() => { setEditCell({ r: originalIndex, c }); setEditValue(cell); }}
                              title={cell}
                            >
                              {cell || <span className="text-slate-300 italic">empty</span>}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => duplicateRow(originalIndex)} className="text-slate-500 hover:bg-slate-100 p-1 rounded" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteRow(originalIndex)} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pageRows.length === 0 && (
                    <tr><td colSpan={csv.columns.length + 2} className="px-3 py-8 text-center text-slate-400">No matching records.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-3">
              <Badge color={filtered.length === csv.rows.length ? 'blue' : 'amber'}>
                {filtered.length} of {csv.rows.length} records
              </Badge>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                <span className="text-sm text-slate-600">Page {page + 1} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep('template')}>← Back</Button>
            <Button onClick={() => setStep('mapping')}>Continue to Mapping →</Button>
          </div>
        </div>
      )}
    </div>
  );
}
