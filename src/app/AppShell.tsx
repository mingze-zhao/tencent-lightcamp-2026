import Sidebar from '../features/cases/Sidebar';
import TranscriptPane from '../features/transcript/TranscriptPane';
import InsightPane from '../features/insights/InsightPane';
import { Settings } from 'lucide-react';
import { useEffect } from 'react';
import { useAppStore } from '@/state/appStore';

export default function AppShell() {
  const {
    state: { settings },
    initialize,
    openSettings,
  } = useAppStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === ',') {
        event.preventDefault();
        openSettings();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('shortcut:focus-elder-search'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openSettings]);

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 ${settings.highContrast ? 'contrast-125' : ''}`}
      style={{ fontSize: `${settings.fontScale}%` }}
    >
      {/* Left Sidebar: Cases / Elders List */}
      <div className="w-80 border-r border-slate-200 bg-white shadow-sm z-10 flex flex-col flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main Content: Split into two panes */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left pane: Transcript */}
        <div className="flex-1 flex flex-col border-r border-slate-200 bg-white">
          <TranscriptPane />
        </div>

        {/* Right pane: Insights & Report */}
        <div className="w-[500px] xl:w-[600px] flex-shrink-0 flex flex-col bg-slate-50 overflow-y-auto">
          <InsightPane />
        </div>
      </div>
      <button
        className="fixed bottom-4 right-4 z-20 rounded-full bg-slate-900 p-3 text-white shadow-lg hover:bg-slate-700"
        onClick={openSettings}
        aria-label="打开设置"
      >
        <Settings className="h-5 w-5" />
      </button>
    </div>
  );
}
