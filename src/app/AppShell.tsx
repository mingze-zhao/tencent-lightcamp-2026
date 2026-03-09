import Sidebar from '../features/cases/Sidebar';
import TranscriptPaneV2 from '../features/transcript/TranscriptPaneV2';
import InsightPaneV2 from '../features/insights/InsightPaneV2';
import CommunityStatsPage from '../features/stats/CommunityStatsPage';
import PeopleArchivePage from '../features/profiles/PeopleArchivePage';
import { Settings } from 'lucide-react';
import { useEffect } from 'react';
import { useAppStore } from '@/state/appStore';

export default function AppShell() {
  const {
    state: { settings, currentPage, communityBodyStats, communityDashboard, isEditMode, savingState, perFieldSavingMap },
    initialize,
    openSettings,
    setCurrentPage,
    setEditMode,
  } = useAppStore();
  const failedFields = Object.entries(perFieldSavingMap).filter(([, value]) => value.status === 'error');
  const savingFields = Object.entries(perFieldSavingMap).filter(([, value]) => value.status === 'saving');

  useEffect(() => {
    void initialize();
    // Initialize once on mount; avoid re-running and resetting selected elder/session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            <button
              className={`rounded-md px-3 py-1.5 text-sm ${currentPage === 'archive' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
              onClick={() => setCurrentPage('archive')}
            >
              人员档案
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-xs ${savingState === 'saving' ? 'bg-amber-100 text-amber-700' : savingState === 'error' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {savingState === 'saving'
                  ? `保存中(${savingFields.length})`
                  : savingState === 'error'
                  ? `保存失败(${failedFields.length})`
                  : '已同步'}
              </span>
              <button
                className={`rounded-md px-3 py-1.5 text-sm ${isEditMode ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                onClick={() => setEditMode(!isEditMode)}
                aria-label="切换编辑模式"
              >
                {isEditMode ? '退出编辑' : '进入编辑'}
              </button>
            </div>
          </div>
          {currentPage === 'community' ? (
            <CommunityStatsPage stats={communityBodyStats} dashboard={communityDashboard} />
          ) : currentPage === 'archive' ? (
            <PeopleArchivePage />
          ) : (
            <div className="flex-1 grid overflow-hidden [grid-template-columns:minmax(420px,48%)_minmax(620px,52%)]">
              {/* Left pane: Transcript */}
              <div className="min-w-0 flex flex-col border-r border-slate-200 bg-white">
                <TranscriptPaneV2 />
              </div>

              {/* Right pane: Insights & Report */}
              <div className="min-w-0 flex flex-col bg-slate-50 overflow-y-auto">
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
