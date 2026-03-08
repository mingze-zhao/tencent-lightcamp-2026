import type { CalendarDay, ElderProfile } from '@/types';

interface ElderCalendarProps {
  days: CalendarDay[];
  elders: ElderProfile[];
  selectedDate?: string;
  onSelectDate: (date: string) => void;
}

const toNameMap = (elders: ElderProfile[]) =>
  elders.reduce<Record<string, string>>((acc, elder) => {
    acc[elder.id] = elder.name;
    return acc;
  }, {});

export default function ElderCalendar({ days, elders, selectedDate, onSelectDate }: ElderCalendarProps) {
  const nameMap = toNameMap(elders);
  const sorted = days.slice().sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">采访日历入口（有采访记录才显示）</div>
      <div className="max-h-36 overflow-y-auto p-2">
        {sorted.length === 0 ? (
          <div className="px-1 py-2 text-xs text-slate-400">暂无日历数据</div>
        ) : (
          sorted.map((day) => {
            const active = selectedDate === day.date;
            const names = day.elderIds.map((id) => nameMap[id]).filter(Boolean).join('、');
            return (
              <button
                key={day.date}
                className={`mb-1 w-full rounded-md border px-2 py-1.5 text-left text-xs ${
                  active ? 'border-blue-200 bg-blue-50' : 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                }`}
                onClick={() => onSelectDate(day.date)}
              >
                <div className="flex items-center justify-between font-medium text-slate-800">
                  <span>{day.date}</span>
                  <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-700">{day.elderIds.length}人</span>
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">{names || '无姓名'}</div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
