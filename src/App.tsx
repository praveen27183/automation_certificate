import { AppProvider, useApp } from '@/state/AppContext';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { TemplateStep } from '@/components/steps/TemplateStep';
import { CsvStep } from '@/components/steps/CsvStep';
import { MappingStep } from '@/components/steps/MappingStep';
import { PreviewStep } from '@/components/steps/PreviewStep';
import { GenerateStep } from '@/components/steps/GenerateStep';
import { HistoryPanel } from '@/components/HistoryPanel';
import { SettingsPanel } from '@/components/SettingsPanel';
import type { StepId } from '@/types';

function Main() {
  const { step, setStep } = useApp();

  let content;
  if (step === 'template') content = <TemplateStep />;
  else if (step === 'csv') content = <CsvStep />;
  else if (step === 'mapping') content = <MappingStep />;
  else if (step === 'preview') content = <PreviewStep />;
  else if (step === 'generate') content = <GenerateStep />;
  else if (step === 'history') content = <HistoryPanel />;
  else if (step === 'settings') content = <SettingsPanel />;
  else content = <Dashboard onNavigate={(s: StepId) => setStep(s)} />;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {content}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <Main />
    </AppProvider>
  );
}

export default App;
