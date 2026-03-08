import Sidebar from '../features/cases/Sidebar';
import TranscriptPane from '../features/transcript/TranscriptPane';
import InsightPane from '../features/insights/InsightPane';

export default function AppShell() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
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
    </div>
  );
}
