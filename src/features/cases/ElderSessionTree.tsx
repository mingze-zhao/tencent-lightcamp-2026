import type { VisitSession } from '@/types';

interface ElderSessionTreeProps {
  sessions: VisitSession[];
  selectedSessionId?: string;
  onSelectSession: (sessionId: string) => void;
}

export default function ElderSessionTree({ sessions, selectedSessionId, onSelectSession }: ElderSessionTreeProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">采访记录（二级目录）</div>
      <div className="max-h-44 overflow-y-auto p-1">
        {sessions.length === 0 ? (
          <div className="px-2 py-3 text-xs text-slate-400">暂无采访记录</div>
        ) : (
          sessions.map((session) => (
            <button
              key={session.id}
              className={`mb-1 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs ${
                selectedSessionId === session.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
              }`}
              onClick={() => onSelectSession(session.id)}
              aria-label={`切换采访 ${session.date}`}
            >
              <span>{session.date}</span>
              <span className="text-[10px] text-slate-400">{Math.round(session.duration / 60)} 分钟</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
