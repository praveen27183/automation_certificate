import { useState } from 'react';
import { FileText, Table2, Settings2, Eye, Zap, History, Settings, FileStack, Sparkles, RotateCcw, Save, FolderOpen } from 'lucide-react';
import { useApp } from '@/state/AppContext';
import { Button } from '@/components/ui';
import type { StepId } from '@/types';

const NAV: { id: StepId | 'history' | 'settings'; label: string; icon: typeof FileText }[] = [
  { id: 'template', label: 'Template', icon: FileText },
  { id: 'csv', label: 'CSV Data', icon: Table2 },
  { id: 'mapping', label: 'Mapping', icon: Settings2 },
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'generate', label: 'Generate', icon: Zap },
  { id: 'history', label: 'History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { step, setStep, pdf, csv, mappings, reset, exportConfig, importConfig, loadSample } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmSample, setConfirmSample] = useState(false);

  const active = step;

  return (
    <aside className="w-60 shrink-0 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
            <FileStack className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">PDF Bulk Replacer</h1>
            <p className="text-[11px] text-blue-400 font-medium">PRO</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map((n) => {
          const Icon = n.icon;
          const isActive = active === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setStep(n.id as StepId)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {n.label}
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-slate-800 space-y-2">
        <div className="grid grid-cols-3 gap-1 text-center">
          <Stat label="PDF" value={pdf ? '1' : '0'} />
          <Stat label="Rows" value={csv ? csv.rows.length : '0'} />
          <Stat label="Maps" value={mappings.length} />
        </div>
        <Button variant="outline" size="sm" className="w-full bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700" icon={<Sparkles className="w-4 h-4" />} onClick={() => setConfirmSample(true)}>
          Sample Project
        </Button>
        <div className="grid grid-cols-2 gap-1">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:bg-slate-800" icon={<Save className="w-3.5 h-3.5" />} onClick={exportConfig}>
            Export
          </Button>
          <label className="cursor-pointer">
            <span className="inline-flex w-full items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-lg text-slate-400 hover:bg-slate-800 transition-colors">
              <FolderOpen className="w-3.5 h-3.5" />
              Import
            </span>
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importConfig(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        <Button variant="ghost" size="sm" className="w-full text-red-400 hover:bg-red-950/40" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={() => setConfirmReset(true)}>
          New Project
        </Button>
      </div>

      {confirmReset && (
        <ConfirmDialog
          title="Start New Project?"
          message="This will clear the current PDF, CSV, mappings and settings."
          confirmLabel="Start New Project"
          onConfirm={() => { reset(); setConfirmReset(false); }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
      {confirmSample && (
        <ConfirmDialog
          title="Load Sample Project?"
          message="This replaces your current PDF, CSV, and mappings with the sample certificate project."
          confirmLabel="Load Sample"
          onConfirm={async () => { await loadSample(); setConfirmSample(false); }}
          onCancel={() => setConfirmSample(false)}
        />
      )}
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-800/60 rounded px-1 py-1.5">
      <div className="text-sm font-bold text-white">{value}</div>
      <div className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: { title: string; message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600 mt-2">{message}</p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
