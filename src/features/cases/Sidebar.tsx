import { ChevronDown, ChevronRight, Search, UserPlus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/state/appStore';
import type { DailySessionEntry, ElderProfile } from '@/types';
import ElderCalendar from './ElderCalendar';

export default function Sidebar() {
  const {
    state: {
      elders,
      selectedElderId,
      selectedDate,
      selectedSessionId,
      calendarDays,
      isAddElderOpen,
      isEditMode,
      sessionsByElder,
    },
    selectElder,
    loadSessionsForElder,
    selectDate,
    selectSession,
    setCurrentPage,
    openAddElder,
    closeAddElder,
    addElder,
    updateElderFields,
    fetchSessionsByDate,
  } = useAppStore();
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string>('');
  const [activeRisk, setActiveRisk] = useState<'' | 'high' | 'medium' | 'low'>('');
  const [form, setForm] = useState<{
    name: string;
    age: string;
    livingStatus: ElderProfile['livingStatus'];
    chronicDiseases: string;
    tags: string;
    baseElderId?: string;
  }>({
    name: '',
    age: '75',
    livingStatus: '独居',
    chronicDiseases: '高血压',
    tags: '新个案',
  });
  const [calendarExpandedDate, setCalendarExpandedDate] = useState<string | null>(null);
  const [calendarDayItems, setCalendarDayItems] = useState<DailySessionEntry[]>([]);
  const [calendarDayLoading, setCalendarDayLoading] = useState(false);
  const [showFloatingCalendar, setShowFloatingCalendar] = useState(false);
  const [quickPickElderId, setQuickPickElderId] = useState<string>('');
  const [expandedElderId, setExpandedElderId] = useState<string | null>(null);
  const [loadingSessionsForElderId, setLoadingSessionsForElderId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusSearch = () => inputRef.current?.focus();
    window.addEventListener('shortcut:focus-elder-search', focusSearch);
    return () => window.removeEventListener('shortcut:focus-elder-search', focusSearch);
  }, []);

  const filteredElders = useMemo(() => {
    const sorted = [...elders].sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 };
      return rank[a.overallRisk ?? 'low'] - rank[b.overallRisk ?? 'low'];
    });
    return sorted.filter((elder) => {
      const byQuery = query.trim()
        ? elder.name.includes(query.trim()) || (elder.tags ?? []).some((tag) => tag.includes(query.trim()))
        : true;
      const byTag = activeTag ? (elder.tags ?? []).includes(activeTag) : true;
      const byRisk = activeRisk ? (elder.overallRisk ?? 'low') === activeRisk : true;
      return byQuery && byTag && byRisk;
    });
  }, [activeRisk, activeTag, elders, query]);

  const allTags = useMemo(
    () => Array.from(new Set(elders.flatMap((elder) => elder.tags ?? []))).sort((a, b) => a.localeCompare(b)),
    [elders]
  );
  const elderOptions = useMemo(
    () => [...elders].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
    [elders]
  );

  useEffect(() => {
    if (selectedElderId) {
      setQuickPickElderId(selectedElderId);
      return;
    }
    if (!quickPickElderId && elderOptions.length > 0) setQuickPickElderId(elderOptions[0].id);
  }, [elderOptions, quickPickElderId, selectedElderId]);
  const onSelectCalendarDate = async (date: string) => {
    if (calendarExpandedDate === date) {
      setCalendarExpandedDate(null);
      setCalendarDayItems([]);
      return;
    }
    setCalendarExpandedDate(date);
    setCalendarDayLoading(true);
    try {
      const items = await fetchSessionsByDate(date);
      setCalendarDayItems(items);
    } finally {
      setCalendarDayLoading(false);
    }
  };

  return (
    <div className="relative flex h-full flex-col">
      <div className="p-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          家访秒记
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">P2 Demo</span>
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3 p-2">
          <section className="w-full shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-2">
            <div className="mb-1.5 text-sm font-bold text-slate-800">搜索中心</div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="姓名/标签..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="搜索长者"
                className="w-full rounded border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-xs focus:border-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="mt-1.5 max-h-28 space-y-1 overflow-y-auto pr-0.5">
              <div className="flex flex-wrap gap-0.5">
                {[
                  { value: '', label: '全部', cls: 'bg-blue-100 text-blue-700' },
                  { value: 'high', label: '高', cls: 'bg-red-100 text-red-700' },
                  { value: 'medium', label: '中', cls: 'bg-amber-100 text-amber-700' },
                  { value: 'low', label: '低', cls: 'bg-emerald-100 text-emerald-700' },
                ].map((item) => (
                  <button
                    key={item.label}
                    className={`rounded px-1.5 py-0.5 text-[10px] ${activeRisk === item.value ? item.cls : 'bg-slate-100 text-slate-600'}`}
                    onClick={() => setActiveRisk(item.value as '' | 'high' | 'medium' | 'low')}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-0.5">
                <button
                  className={`rounded px-1.5 py-0.5 text-[10px] ${activeTag ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}
                  onClick={() => setActiveTag('')}
                >
                  全部
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    className={`rounded px-1.5 py-0.5 text-[10px] ${activeTag === tag ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}
                    onClick={() => setActiveTag((prev) => (prev === tag ? '' : tag))}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              匹配 <span className="font-semibold text-slate-700">{filteredElders.length}</span> 人
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-2">
            <div className="mb-1 text-sm font-semibold text-slate-700">匹配长者</div>
            <div className="space-y-1 pr-1">
              {filteredElders.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                  没有匹配到长者档案
                </div>
              ) : filteredElders.map((elder, idx) => {
                const isExpanded = expandedElderId === elder.id;
                const sessions = sessionsByElder[elder.id] ?? [];
                const isLoading = loadingSessionsForElderId === elder.id;
                const onToggleExpand = () => {
                  if (isExpanded) {
                    setExpandedElderId(null);
                    return;
                  }
                  setExpandedElderId(elder.id);
                  if (sessions.length === 0) {
                    setLoadingSessionsForElderId(elder.id);
                    void loadSessionsForElder(elder.id).finally(() => setLoadingSessionsForElderId(null));
                  }
                };
                return (
                  <div key={elder.id}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('[data-drawer-item]')) return;
                        onToggleExpand();
                      }}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        elder.id === selectedElderId
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                      role="button"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? `收起${elder.name}采访目录` : `展开${elder.name}采访目录`}
                    >
                      <div className="flex items-start gap-1.5">
                        <span className="mt-0.5 text-slate-400" aria-hidden>
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <div className="text-sm font-semibold text-slate-900">{elder.name}</div>
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              elder.overallRisk === 'high' ? 'bg-red-500' :
                              elder.overallRisk === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} />
                          </div>
                          <div className="flex justify-between items-center text-xs text-slate-500">
                            <span>{elder.age}岁</span>
                            <span>{elder.lastVisitDate ?? '-'}</span>
                          </div>
                          {isEditMode && elder.id === selectedElderId ? (
                            <div className="mt-2 space-y-1 rounded-md border border-slate-200 bg-white p-2">
                              <input
                                className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                                value={elder.name}
                                onChange={(event) => updateElderFields(elder.id, { name: event.target.value })}
                                placeholder="长者姓名"
                              />
                              <input
                                className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                                value={(elder.tags ?? []).join(',')}
                                onChange={(event) =>
                                  updateElderFields(elder.id, {
                                    tags: event.target.value
                                      .split(',')
                                      .map((tag) => tag.trim())
                                      .filter(Boolean),
                                  })
                                }
                                placeholder="标签，逗号分隔"
                              />
                            </div>
                          ) : null}
                          {!!elder.tags?.length && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {elder.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                    {isExpanded ? (
                      <div className="ml-5 mt-0 mb-2 rounded-md border border-slate-200 bg-slate-50/80 overflow-hidden" data-drawer>
                        <div className="px-2 py-1.5 text-[10px] font-medium text-slate-500 border-b border-slate-200">
                          采访日期
                        </div>
                        {isLoading ? (
                          <div className="px-3 py-4 text-center text-xs text-slate-500">加载中…</div>
                        ) : sessions.length === 0 ? (
                          <div className="px-3 py-4 text-center text-xs text-slate-500">暂无采访记录</div>
                        ) : (
                          <ul className="max-h-40 overflow-y-auto">
                            {[...sessions]
                              .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
                              .map((session) => (
                                <li key={session.id}>
                                  <button
                                    type="button"
                                    data-drawer-item
                                    onClick={() => {
                                      void selectElder(elder.id, undefined, session.date);
                                    }}
                                    className={`w-full px-3 py-2 text-left text-xs transition-colors flex items-center gap-2 rounded ${
                                      selectedSessionId === session.id
                                        ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300'
                                        : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${selectedSessionId === session.id ? 'bg-blue-600' : 'bg-slate-400'}`} aria-hidden />
                                    {session.date ? new Date(session.date).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) : session.id}
                                  </button>
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
      <div className="border-t border-slate-200 bg-white p-4">
        <div className="mb-2 text-xs font-semibold text-slate-600">快速进入已有档案</div>
        <div className="mb-2 flex gap-2">
          <select
            className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
            value={quickPickElderId}
            onChange={(event) => setQuickPickElderId(event.target.value)}
          >
            {elderOptions.map((elder) => (
              <option key={elder.id} value={elder.id}>
                {elder.name}
              </option>
            ))}
          </select>
          <button
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => {
              if (!quickPickElderId) return;
              void selectElder(quickPickElderId).then(() => setCurrentPage('archive'));
            }}
          >
            打开
          </button>
        </div>
        <button
          className="mb-3 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          onClick={() => setShowFloatingCalendar((prev) => !prev)}
        >
          {showFloatingCalendar ? '收起采访日历' : '打开采访日历'}
        </button>
        <button
          onClick={openAddElder}
          aria-label="新增长者档案"
          className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          新增长者档案
        </button>
      </div>
      {showFloatingCalendar ? (
        <div className="absolute bottom-28 left-2 right-2 z-20 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
          <ElderCalendar
            compact
            days={calendarDays}
            elders={elders}
            selectedDate={selectedDate}
            expandedDate={calendarExpandedDate}
            dayTimelineItems={calendarDayItems}
            dayTimelineLoading={calendarDayLoading}
            onCloseExpanded={() => {
              setCalendarExpandedDate(null);
              setCalendarDayItems([]);
            }}
            onPickDayTimelineItem={(item) => {
              void selectElder(item.elderId).then(() => {
                selectSession(item.sessionId);
                selectDate(item.date);
                setShowFloatingCalendar(false);
              });
            }}
            onSelectDate={(date) => {
              void onSelectCalendarDate(date);
            }}
          />
        </div>
      ) : null}

      {isAddElderOpen ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-800">新增长者档案</h3>
              <button
                onClick={closeAddElder}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">基于已有档案（可选）</label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-800"
                  value={form.baseElderId ?? ''}
                  onChange={(event) => {
                    const id = event.target.value || undefined;
                    if (!id) {
                      setForm((prev) => ({ ...prev, baseElderId: undefined }));
                      return;
                    }
                    const elder = elders.find((e) => e.id === id);
                    if (elder) {
                      setForm({
                        baseElderId: id,
                        name: elder.name,
                        age: String(elder.age),
                        livingStatus: elder.livingStatus,
                        chronicDiseases: elder.chronicDiseases.join('、'),
                        tags: (elder.tags ?? []).join('、'),
                      });
                    }
                  }}
                >
                  <option value="">新建空白档案</option>
                  {elderOptions.map((elder) => (
                    <option key={elder.id} value={elder.id}>
                      {elder.name}（{elder.age}岁）
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">姓名</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="必填"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">年龄</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="岁"
                    value={form.age}
                    onChange={(event) => setForm((prev) => ({ ...prev, age: event.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">居住情况</label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.livingStatus}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, livingStatus: event.target.value as ElderProfile['livingStatus'] }))
                  }
                >
                  <option value="独居">独居</option>
                  <option value="与配偶同住">与配偶同住</option>
                  <option value="与子女同住">与子女同住</option>
                  <option value="院舍">院舍</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">慢病（可多选，用顿号分隔）</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="例：高血压、糖尿病"
                  value={form.chronicDiseases}
                  onChange={(event) => setForm((prev) => ({ ...prev, chronicDiseases: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">标签（可多选，用顿号分隔）</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="例：新个案、重点跟进"
                  value={form.tags}
                  onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                />
              </div>
              <button
                className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none"
                disabled={!form.name.trim()}
                onClick={() => {
                  const chronic = form.chronicDiseases.split(/[、,，]/).map((s) => s.trim()).filter(Boolean);
                  const tags = form.tags.split(/[、,，]/).map((s) => s.trim()).filter(Boolean);
                  void addElder({
                    name: form.name.trim(),
                    age: Number(form.age) || 75,
                    gender: 'M',
                    address: '待补充',
                    contactNumber: '待补充',
                    livingStatus: form.livingStatus,
                    chronicDiseases: chronic.length ? chronic : ['待补充'],
                    emergencyContact: { name: '待补充', relation: '家属', phone: '待补充' },
                    tags: tags.length ? tags : ['新个案'],
                  });
                  setForm({
                    name: '',
                    age: '75',
                    livingStatus: '独居',
                    chronicDiseases: '高血压',
                    tags: '新个案',
                    baseElderId: undefined,
                  });
                }}
              >
                保存档案
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
