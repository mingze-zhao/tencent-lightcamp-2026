import Sidebar from '../features/cases/Sidebar';
import TranscriptPaneV2 from '../features/transcript/TranscriptPaneV2';
import InsightPaneV2 from '../features/insights/InsightPaneV2';
import CommunityStatsPage from '../features/stats/CommunityStatsPage';
import { Settings } from 'lucide-react';
import { useEffect } from 'react';
import { useAppStore } from '@/state/appStore';

export default function AppShell() {
  const {
    state: { settings, currentPage, communityBodyStats },
    initialize,
    openSettings,
    setCurrentPage,
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
        <div className="flex w-full flex-col">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
            <button
              className={`rounded-md px-3 py-1.5 text-sm ${currentPage === 'workbench' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
              onClick={() => setCurrentPage('workbench')}
            >
              个案工作台
            </button>
            <button
              className={`rounded-md px-3 py-1.5 text-sm ${currentPage === 'community' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
              onClick={() => setCurrentPage('community')}
            >
              社区统计
            </button>
          </div>
          {currentPage === 'community' ? (
            <CommunityStatsPage stats={communityBodyStats} />
          ) : (
            <div className="flex-1 flex overflow-hidden">
              {/* Left pane: Transcript */}
              <div className="flex-1 flex flex-col border-r border-slate-200 bg-white">
                <TranscriptPaneV2 />
              </div>

              {/* Right pane: Insights & Report */}
              <div className="w-[500px] xl:w-[600px] flex-shrink-0 flex flex-col bg-slate-50 overflow-y-auto">
                <InsightPaneV2 />
              </div>
            </div>
          )}
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
