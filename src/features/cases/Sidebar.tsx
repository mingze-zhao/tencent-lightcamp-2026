import { Search, UserPlus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/state/appStore';
import type { ElderProfile } from '@/types';

export default function Sidebar() {
  const {
    state: { elders, selectedElderId, isAddElderOpen, settings },
    selectElder,
    openAddElder,
    closeAddElder,
    addElder,
  } = useAppStore();
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({
    name: '',
    age: '75',
    livingStatus: '独居' as ElderProfile['livingStatus'],
    chronicDiseases: '高血压',
  });
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
    if (!query.trim()) return sorted;
    return sorted.filter((elder) => elder.name.includes(query.trim()));
  }, [elders, query]);

  return (
    <div className="relative flex h-full flex-col">
      <div className="p-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          家访秒记
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">P2 Demo</span>
        </h1>
      </div>
      
      <div className="p-4 border-b border-slate-200 bg-slate-50/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="搜索长者姓名..." 
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="搜索长者"
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className={`p-2 ${settings.compactMode ? 'space-y-0.5' : 'space-y-1'}`}>
          {filteredElders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
              没有匹配到长者档案
            </div>
          ) : filteredElders.map((elder, idx) => (
            <motion.div 
              key={elder.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => {
                void selectElder(elder.id);
              }}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                elder.id === selectedElderId ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'
              }`}
              role="button"
              aria-label={`切换到${elder.name}个案`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="font-medium text-slate-900">{elder.name}</div>
                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                  elder.overallRisk === 'high' ? 'bg-red-500' : 
                  elder.overallRisk === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>{elder.age}岁</span>
                <span>{elder.lastVisitDate ?? '-'}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-slate-200">
        <button
          onClick={openAddElder}
          aria-label="新增长者档案"
          className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          新增长者档案
        </button>
      </div>

      {isAddElderOpen ? (
        <div className="absolute inset-0 z-10 flex bg-black/30">
          <div className="ml-auto h-full w-80 bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">新增长者</h3>
              <button onClick={closeAddElder} aria-label="关闭新增长者面板">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="姓名"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="年龄"
                value={form.age}
                onChange={(event) => setForm((prev) => ({ ...prev, age: event.target.value }))}
              />
              <select
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
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
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="慢病（逗号分隔）"
                value={form.chronicDiseases}
                onChange={(event) => setForm((prev) => ({ ...prev, chronicDiseases: event.target.value }))}
              />
              <button
                className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
                disabled={!form.name.trim()}
                onClick={() => {
                  void addElder({
                    name: form.name.trim(),
                    age: Number(form.age) || 75,
                    gender: 'M',
                    address: '待补充',
                    contactNumber: '待补充',
                    livingStatus: form.livingStatus,
                    chronicDiseases: form.chronicDiseases.split(',').map((item) => item.trim()),
                    emergencyContact: {
                      name: '待补充',
                      relation: '家属',
                      phone: '待补充',
                    },
                  });
                  setForm({
                    name: '',
                    age: '75',
                    livingStatus: '独居',
                    chronicDiseases: '高血压',
                  });
                }}
              >
                保存长者档案
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
