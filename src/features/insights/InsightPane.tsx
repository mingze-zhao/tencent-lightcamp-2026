import { AlertCircle, CheckCircle2, Clock, Pill, Activity, HeartPulse, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/state/appStore';

const riskBadgeMap = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-emerald-100 text-emerald-700',
};

export default function InsightPane() {
  const {
    state: { selectedSession, status, recordingState, settings },
    runExtractAndReport,
    toggleActionItem,
    setActiveSegment,
    pushToast,
  } = useAppStore();

  const extract = selectedSession?.extractResult;

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
        <h2 className="font-semibold text-slate-800">个案洞察看板</h2>
        <button
          className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
          onClick={() => void runExtractAndReport()}
          aria-label="生成结构化报告"
        >
          生成报告
        </button>
      </div>

      <div className={`flex-1 space-y-6 overflow-y-auto ${settings.compactMode ? 'p-4' : 'p-6'}`}>
        {status === 'loading' ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-28 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
          </div>
        ) : null}

        {status !== 'loading' && !selectedSession ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            当前无可展示会话，请先在左侧选择长者。
          </div>
        ) : null}

        {selectedSession ? (
          <>
            <motion.div
              initial={settings.reducedMotion ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-2 font-semibold text-red-800">
                <AlertCircle className="h-5 w-5" />
                <h3>高风险预警 ({extract?.warnings.length ?? 0})</h3>
              </div>
              {extract?.warnings.length ? (
                <div className="space-y-2">
                  {extract.warnings.map((warning, idx) => (
                    <button
                      key={warning}
                      className="flex w-full items-start gap-3 rounded-lg border border-red-100 bg-white p-3 text-left"
                      onClick={() => {
                        const target = selectedSession.transcript.find((item) =>
                          warning.includes('降压药') ? item.text.includes('降压药') : true
                        );
                        setActiveSegment(target?.id);
                      }}
                      aria-label={`定位预警 ${idx + 1}`}
                    >
                      <div className="mt-2 h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
                      <p className="text-sm font-medium text-slate-800">{warning}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-red-200 bg-white p-3 text-xs text-slate-500">
                  当前会话暂无高风险预警。
                </div>
              )}
            </motion.div>

            {extract ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <motion.div
                  initial={settings.reducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="absolute left-0 top-0 h-full w-1 bg-red-500" />
                  <div className="mb-2 flex items-center gap-2 font-semibold text-slate-700">
                    <Pill className="h-4 w-4 text-slate-400" /> 用药依从性
                  </div>
                  <p className="mb-2 text-sm text-slate-600">{extract.medication.summary}</p>
                  <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${riskBadgeMap[extract.medication.risk]}`}>
                    {extract.medication.risk}
                  </span>
                </motion.div>

                <motion.div
                  initial={settings.reducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="absolute left-0 top-0 h-full w-1 bg-amber-500" />
                  <div className="mb-2 flex items-center gap-2 font-semibold text-slate-700">
                    <Activity className="h-4 w-4 text-slate-400" /> 身体症状
                  </div>
                  <ul className="mb-2 list-inside list-disc space-y-1 text-sm text-slate-600">
                    {extract.symptoms.map((item) => (
                      <li key={item.description}>{item.description}</li>
                    ))}
                  </ul>
                  <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${riskBadgeMap[extract.symptoms[0]?.risk ?? 'low']}`}>
                    {extract.symptoms[0]?.risk ?? 'low'}
                  </span>
                </motion.div>

                <motion.div
                  initial={settings.reducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="absolute left-0 top-0 h-full w-1 bg-emerald-500" />
                  <div className="mb-2 flex items-center gap-2 font-semibold text-slate-700">
                    <HeartPulse className="h-4 w-4 text-slate-400" /> 情绪状态
                  </div>
                  <p className="mb-2 text-sm text-slate-600">{extract.emotion.summary}</p>
                  <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${riskBadgeMap[extract.emotion.risk]}`}>
                    {extract.emotion.risk}
                  </span>
                </motion.div>

                <motion.div
                  initial={settings.reducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="absolute left-0 top-0 h-full w-1 bg-amber-500" />
                  <div className="mb-2 flex items-center gap-2 font-semibold text-slate-700">
                    <Users className="h-4 w-4 text-slate-400" /> 社交与支援
                  </div>
                  <p className="mb-2 text-sm text-slate-600">{extract.social_support.summary}</p>
                  <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${riskBadgeMap[extract.social_support.risk]}`}>
                    {extract.social_support.risk}
                  </span>
                </motion.div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                尚未抽取结构化信息。点击右上角“生成报告”进行抽取。
              </div>
            )}

            <motion.div
              initial={settings.reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-slate-800">待跟进事项 (Action Items)</h3>
              </div>
              {extract?.action_items.length ? (
                <div className="divide-y divide-slate-100">
                  {extract.action_items.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 p-4">
                      <input
                        type="checkbox"
                        checked={item.status === 'completed'}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                        onChange={(event) => void toggleActionItem(item.id, event.target.checked)}
                        aria-label={`完成事项 ${item.content}`}
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.content}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${riskBadgeMap[item.priority]}`}>
                            {item.priority}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="h-3 w-3" />
                            {item.status === 'completed' ? '已完成' : '待处理'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-sm text-slate-500">暂无待跟进事项。</div>
              )}
            </motion.div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">报告预览</h3>
                <button
                  className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                  onClick={() => {
                    if (!selectedSession.report) {
                      pushToast({ type: 'warning', title: '暂无报告', description: '请先生成报告。' });
                      return;
                    }
                    void navigator.clipboard.writeText(selectedSession.report);
                    pushToast({ type: 'success', title: '已复制报告', description: '可粘贴到社福系统。' });
                  }}
                  aria-label="复制报告"
                >
                  复制
                </button>
              </div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-slate-700">
                {selectedSession.report ?? (recordingState === 'extracting' ? '报告生成中...' : '尚无报告内容。')}
              </pre>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
