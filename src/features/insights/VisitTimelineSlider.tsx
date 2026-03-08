import type { VisitSession } from '@/types';

interface VisitTimelineSliderProps {
  sessions: VisitSession[];
  selectedSessionId?: string;
  onSelectSession: (sessionId: string) => void;
}

export default function VisitTimelineSlider({ sessions, selectedSessionId, onSelectSession }: VisitTimelineSliderProps) {
  if (!sessions.length) return null;
  const sorted = sessions.slice().sort((a, b) => a.date.localeCompare(b.date));
  const currentIndex = Math.max(0, sorted.findIndex((session) => session.id === selectedSessionId));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 text-sm font-semibold text-slate-800">采访时间线</div>
      <input
        type="range"
        min={0}
        max={Math.max(0, sorted.length - 1)}
        value={currentIndex}
        onChange={(event) => {
          const index = Number(event.target.value);
          const session = sorted[index];
          if (session) onSelectSession(session.id);
        }}
        className="w-full"
      />
      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
        <span>{sorted[0].date}</span>
        <span>{sorted[sorted.length - 1]?.date}</span>
      </div>
      <div className="mt-2 text-xs text-slate-600">当前：{sorted[currentIndex]?.date}</div>
    </div>
  );
}
