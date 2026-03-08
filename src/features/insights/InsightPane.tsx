import { AlertCircle, CheckCircle2, Clock, Pill, Activity, HeartPulse, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function InsightPane() {
  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 sticky top-0 z-10 shrink-0">
        <h2 className="font-semibold text-slate-800">个案洞察看板</h2>
        <button className="text-sm text-blue-600 font-medium hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md transition-colors">
          生成报告
        </button>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        
        {/* Warning Center */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 text-red-800 font-semibold mb-3">
            <AlertCircle className="w-5 h-5" />
            <h3>高风险预警 (1)</h3>
          </div>
          <div className="bg-white rounded-lg p-3 border border-red-100 flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 mt-2 shrink-0 animate-pulse" />
            <div>
              <p className="text-slate-800 font-medium text-sm mb-1">连续漏服降压药</p>
              <p className="text-slate-600 text-xs">个案自述前两日停服降压药，需立刻干预并联系家属。</p>
            </div>
          </div>
        </motion.div>

        {/* Structured Data Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Medication */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
            <div className="flex items-center gap-2 text-slate-700 font-semibold mb-2">
              <Pill className="w-4 h-4 text-slate-400" />用药依从性
            </div>
            <p className="text-sm text-slate-600 mb-2">有时忘记食降压药，近期停药2天。</p>
            <div className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">高风险</div>
          </motion.div>

          {/* Symptoms */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
            <div className="flex items-center gap-2 text-slate-700 font-semibold mb-2">
              <Activity className="w-4 h-4 text-slate-400" />身体症状
            </div>
            <ul className="text-sm text-slate-600 space-y-1 mb-2 list-disc list-inside pl-1">
              <li>近期双下肢水肿明显</li>
              <li>自觉行走沉重</li>
            </ul>
            <div className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">中风险</div>
          </motion.div>

          {/* Emotion */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            <div className="flex items-center gap-2 text-slate-700 font-semibold mb-2">
              <HeartPulse className="w-4 h-4 text-slate-400" />情绪状态
            </div>
            <p className="text-sm text-slate-600 mb-2">情绪平稳，对访谈表现配合。</p>
            <div className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">低风险</div>
          </motion.div>

          {/* Social Support */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
            <div className="flex items-center gap-2 text-slate-700 font-semibold mb-2">
              <Users className="w-4 h-4 text-slate-400" />社交与支援
            </div>
            <p className="text-sm text-slate-600 mb-2">独居，子女偶尔探望。</p>
            <div className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">中风险</div>
          </motion.div>
        </div>

        {/* Action Items */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-800">待跟进事项 (Action Items)</h3>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="p-4 flex items-start gap-3">
              <input type="checkbox" className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <div>
                <p className="text-sm font-medium text-slate-800">联系门诊医生确认降压药服用方案</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-700">高优先级</span>
                  <span className="flex items-center gap-1 text-xs text-slate-500"><Clock className="w-3 h-3" />下次随访前</span>
                </div>
              </div>
            </div>
            <div className="p-4 flex items-start gap-3">
              <input type="checkbox" className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <div>
                <p className="text-sm font-medium text-slate-800">跟进下肢水肿情况，建议转介物理治疗</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">中优先级</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
