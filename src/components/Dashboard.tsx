import { FileText, Table2, Settings2, Zap, FileStack, Sparkles } from 'lucide-react';
import { useApp } from '@/state/AppContext';
import { Button, Card } from '@/components/ui';
import type { StepId } from '@/types';

export function Dashboard({ onNavigate }: { onNavigate: (s: StepId) => void }) {
  const { pdf, csv, mappings, results, loadSample } = useApp();

  const stats = [
    { label: 'Template', value: pdf ? '1 PDF' : 'None', icon: FileText, color: 'blue' },
    { label: 'Records', value: csv ? csv.rows.length : 0, icon: Table2, color: 'emerald' },
    { label: 'Mappings', value: mappings.length, icon: Settings2, color: 'amber' },
    { label: 'Generated', value: results.filter((r) => r.status === 'success').length, icon: Zap, color: 'purple' },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <FileStack className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">PDF Bulk Replacer Pro</h1>
            <p className="text-slate-500">Create personalized PDFs from CSV data.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => {
          const Icon = s.icon;
          const colors: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-600',
            emerald: 'bg-emerald-50 text-emerald-600',
            amber: 'bg-amber-50 text-amber-600',
            purple: 'bg-purple-50 text-purple-600',
          };
          return (
            <Card key={s.label} className="p-5">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colors[s.color]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{s.value}</div>
              <div className="text-sm text-slate-500">{s.label}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-2">Quick Start</h3>
          <p className="text-sm text-slate-500 mb-4">Load the sample certificate project to test the full workflow instantly.</p>
          <Button icon={<Sparkles className="w-4 h-4" />} onClick={loadSample} className="w-full">Load Sample Project</Button>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-2">5-Step Workflow</h3>
          <div className="space-y-2 text-sm text-slate-600">
            {[
              { n: 1, l: 'Upload PDF', s: 'template' as StepId },
              { n: 2, l: 'Upload CSV', s: 'csv' as StepId },
              { n: 3, l: 'Mapping', s: 'mapping' as StepId },
              { n: 4, l: 'Preview', s: 'preview' as StepId },
              { n: 5, l: 'Generate', s: 'generate' as StepId },
            ].map((step) => (
              <button key={step.n} onClick={() => onNavigate(step.s)} className="flex items-center gap-2 hover:text-blue-600 w-full text-left">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs flex items-center justify-center font-semibold">{step.n}</span>
                {step.l}
              </button>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-2">Privacy</h3>
          <p className="text-sm text-slate-500">All processing happens locally in your browser. Your PDFs, CSV data, and personal information never leave your device. No login required.</p>
        </Card>
      </div>
    </div>
  );
}
