import { Settings, Type, FileOutput, Gauge } from 'lucide-react';
import { useApp } from '@/state/AppContext';
import { Card, SectionTitle } from '@/components/ui';
import type { GenerationSettings } from '@/types';

export function SettingsPanel() {
  const { settings, setSettings } = useApp();

  const update = (patch: Partial<GenerationSettings>) => setSettings({ ...settings, ...patch });

  return (
    <div>
      <SectionTitle title="Settings" subtitle="Configure PDF generation, output, and performance." icon={<Settings className="w-5 h-5" />} />

      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Type className="w-4 h-4 text-blue-600" /> PDF</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Replacement Mode">
              <select value={settings.mode} onChange={(e) => update({ mode: e.target.value as any })} className="input">
                <option value="placeholder">Placeholder Mode (recommended)</option>
                <option value="findreplace">Find & Replace Mode</option>
              </select>
            </Field>
            <Field label="Preserve Original Formatting">
              <label className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={settings.preserveOriginal} onChange={(e) => update({ preserveOriginal: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm text-slate-600">Cover original text before drawing replacement</span>
              </label>
            </Field>
            <Field label="Auto-fit Text">
              <label className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={settings.autoFit} onChange={(e) => update({ autoFit: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm text-slate-600">Shrink long text to fit original area</span>
              </label>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min Font Size">
                <input type="number" min={4} max={96} value={settings.minFontSize} onChange={(e) => update({ minFontSize: Number(e.target.value) })} className="input" />
              </Field>
              <Field label="Max Font Size">
                <input type="number" min={4} max={144} value={settings.maxFontSize} onChange={(e) => update({ maxFontSize: Number(e.target.value) })} className="input" />
              </Field>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><FileOutput className="w-4 h-4 text-blue-600" /> Output</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Filename Template">
              <input value={settings.filenameTemplate} onChange={(e) => update({ filenameTemplate: e.target.value })} placeholder="{{CERTIFICATE_ID}}_{{PERSON}}" className="input" />
              <p className="text-xs text-slate-500 mt-1">Use {`{{COLUMN}}`} placeholders. Invalid filename characters are auto-sanitized.</p>
            </Field>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={settings.zipEnabled} onChange={(e) => update({ zipEnabled: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm text-slate-600">Enable ZIP download</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={settings.individualDownloads} onChange={(e) => update({ individualDownloads: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm text-slate-600">Enable individual downloads</span>
              </label>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Gauge className="w-4 h-4 text-blue-600" /> Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Batch Size">
              <input type="number" min={1} max={100} value={settings.batchSize} onChange={(e) => update({ batchSize: Number(e.target.value) })} className="input" />
              <p className="text-xs text-slate-500 mt-1">Records processed before UI update. Default: 10.</p>
            </Field>
            <Field label="Memory Optimization">
              <label className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={settings.memoryOptimization} onChange={(e) => update({ memoryOptimization: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm text-slate-600">Release buffers between batches (slower, lower memory)</span>
              </label>
            </Field>
          </div>
        </Card>
      </div>

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
