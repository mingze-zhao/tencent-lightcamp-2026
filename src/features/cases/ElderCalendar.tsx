import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CalendarDay, DailySessionEntry, ElderProfile } from '@/types';

interface ElderCalendarProps {
  days: CalendarDay[];
  elders: ElderProfile[];
  selectedDate?: string;
  onSelectDate: (date: string) => void;
  expandedDate?: string | null;
  dayTimelineItems?: DailySessionEntry[];
  dayTimelineLoading?: boolean;
  onCloseExpanded?: () => void;
  onPickDayTimelineItem?: (item: DailySessionEntry) => void;
}

const toNameMap = (elders: ElderProfile[]) =>
  elders.reduce<Record<string, string>>((acc, elder) => {
    acc[elder.id] = elder.name;
    return acc;
  }, {});
const toRiskMap = (elders: ElderProfile[]) =>
  elders.reduce<Record<string, ElderProfile['overallRisk']>>((acc, elder) => {
    acc[elder.id] = elder.overallRisk;
    return acc;
  }, {});
const riskRank = (risk?: ElderProfile['overallRisk']) => (risk === 'high' ? 3 : risk === 'medium' ? 2 : 1);

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const startOfWeek = (date: Date) => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
};
const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};
const toLocalKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function ElderCalendar({
  days,
  elders,
  selectedDate,
  onSelectDate,
  expandedDate,
  dayTimelineItems = [],
  dayTimelineLoading = false,
  onCloseExpanded,
  onPickDayTimelineItem,
}: ElderCalendarProps) {
  const nameMap = toNameMap(elders);
  const riskMap = toRiskMap(elders);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date(selectedDate ?? Date.now())));
  const dayMap = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  const gridCells = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart);
    const totalDays = 42;
    return Array.from({ length: totalDays }, (_, index) => addDays(gridStart, index)).map((date) => {
      const key = toLocalKey(date);
      const day = dayMap.get(key);
      const names = (day?.elderIds ?? []).map((id) => nameMap[id]).filter(Boolean);
      const dayMaxRisk =
        (day?.elderIds ?? [])
          .map((id) => riskMap[id])
          .sort((a, b) => riskRank(b) - riskRank(a))[0] ?? 'low';
      return {
        key,
        date,
        inCurrentMonth: date.getMonth() === currentMonth.getMonth(),
        hasInterview: !!day && day.elderIds.length > 0,
        names,
        dayMaxRisk,
      };
    });
  }, [currentMonth, dayMap, nameMap, riskMap]);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
        采访日历入口（有采访才高亮）
      </div>
      <div className="p-1.5">
        <div className="mb-1.5 flex items-center justify-between px-1">
          <button
            className="rounded p-1 text-slate-500 hover:bg-slate-200"
            onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            aria-label="上个月"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-sm font-semibold text-slate-700">
            {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </div>
          <button
            className="rounded p-1 text-slate-500 hover:bg-slate-200"
            onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            aria-label="下个月"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-500">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
            <div key={label} className="py-0.5">
              {label}
            </div>
          ))}
        </div>
        <div className="space-y-0.5">
          {Array.from({ length: 6 }, (_, weekIdx) => {
            const weekCells = gridCells.slice(weekIdx * 7, weekIdx * 7 + 7);
            const weekHasExpandedDate = !!expandedDate && weekCells.some((cell) => cell.key === expandedDate);
            return (
              <div key={`week-${weekIdx}`} className="space-y-0.5">
                <div className="grid grid-cols-7 gap-1">
                  {weekCells.map((cell) => {
                    const active = selectedDate === cell.key;
                    const label =
                      cell.names.length === 0
                        ? ''
                        : cell.names.length <= 2
                        ? cell.names.join('、')
                        : `${cell.names.slice(0, 2).join('、')}+${cell.names.length - 2}`;
                    const riskClass =
                      cell.dayMaxRisk === 'high'
                        ? active
                          ? 'border-red-300 bg-red-100 text-red-700'
                          : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                        : cell.dayMaxRisk === 'medium'
                        ? active
                          ? 'border-amber-300 bg-amber-100 text-amber-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                        : active
                        ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                        : 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100';
                    return (
                      <button
                        key={cell.key}
                        onClick={() => cell.hasInterview && onSelectDate(cell.key)}
                        disabled={!cell.hasInterview}
                        className={`min-h-[40px] rounded-md border px-1 py-0.5 text-left ${
                          !cell.inCurrentMonth
                            ? 'border-transparent bg-transparent text-slate-300'
                            : cell.hasInterview
                            ? riskClass
                            : 'border-slate-200 bg-white text-slate-400'
                        }`}
                      >
                        <div className="text-[11px] font-semibold">{cell.date.getDate()}</div>
                        <div className="mt-0.5 line-clamp-1 text-[9px]">{label}</div>
                      </button>
                    );
                  })}
                </div>
                {weekHasExpandedDate ? (
                  <div className="rounded-md border border-slate-200 bg-white p-1.5">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="text-[11px] font-semibold text-slate-700">当日日程 · {expandedDate}</div>
                      <button
                        className="rounded px-1 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100"
                        onClick={() => onCloseExpanded?.()}
                      >
                        收起
                      </button>
                    </div>
                    {dayTimelineLoading ? (
                      <div className="text-[11px] text-slate-500">加载中...</div>
                    ) : dayTimelineItems.length === 0 ? (
                      <div className="text-[11px] text-slate-500">该日暂无采访会话。</div>
                    ) : (
                      <div className="overflow-x-auto pb-1">
                        <div className="flex min-w-max gap-1.5">
                          {dayTimelineItems.map((item, idx) => {
                            const elderRisk = riskMap[item.elderId] ?? 'low';
                            const timelineClass =
                              elderRisk === 'high'
                                ? 'border-red-200 bg-red-50 hover:bg-red-100'
                                : elderRisk === 'medium'
                                ? 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                                : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100';
                            return (
                              <button
                                key={item.sessionId}
                                className={`w-28 shrink-0 rounded border px-1.5 py-1 text-left ${timelineClass}`}
                                onClick={() => onPickDayTimelineItem?.(item)}
                              >
                                <div className="text-[10px] font-semibold text-slate-600">时段 {idx + 1}</div>
                                <div className="mt-0.5 text-[11px] font-medium text-slate-800">{item.elderName}</div>
                                <div className="mt-0.5 text-[10px] text-slate-500">
                                  {Math.round(item.duration / 60)}分 · 预警{item.warningCount}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
