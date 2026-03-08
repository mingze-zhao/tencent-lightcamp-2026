import { Search, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Sidebar() {
  const elders = [
    { id: '1', name: '陈伯', age: 78, risk: 'high', lastVisit: '2026-03-01' },
    { id: '2', name: '李婆婆', age: 82, risk: 'medium', lastVisit: '2026-02-25' },
    { id: '3', name: '张叔', age: 71, risk: 'low', lastVisit: '2026-03-05' },
  ];

  return (
    <div className="flex flex-col h-full">
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
            type="text" 
            placeholder="搜索长者姓名..." 
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {elders.map((elder, idx) => (
            <motion.div 
              key={elder.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                elder.id === '1' ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="font-medium text-slate-900">{elder.name}</div>
                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                  elder.risk === 'high' ? 'bg-red-500' : 
                  elder.risk === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>{elder.age}岁</span>
                <span>{elder.lastVisit}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-slate-200">
        <button className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
          <UserPlus className="w-4 h-4" />
          新增长者档案
        </button>
      </div>
    </div>
  );
}
