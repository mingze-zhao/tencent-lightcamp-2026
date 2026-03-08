import { Mic, Search, Square, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/state/appStore';

export default function TranscriptPane() {
  const {
    state: {
      selectedSession,
      recordingState,
      recordingSeconds,
      transcriptSearchKeyword,
      activeSegmentId,
      settings,
    },
    setSearchKeyword,
    setActiveSegment,
    toggleRecording,
    pushToast,
  } = useAppStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const paneRef = useRef<HTMLDivElement>(null);
  const transcript = selectedSession?.transcript ?? [];

  const searchHits = useMemo(() => {
    if (!transcriptSearchKeyword.trim()) return [];
    return transcript.filter((segment) => segment.text.includes(transcriptSearchKeyword.trim()));
  }, [transcript, transcriptSearchKeyword]);

  const recordingLabel = {
    idle: '未开始',
    recording: '录音中',
    transcribing: '转写中',
    extracting: '抽取中',
    completed: '已完成',
    error: '失败',
  }[recordingState];

  const jumpToNextHit = () => {
    if (searchHits.length === 0) {
      pushToast({ type: 'warning', title: '没有匹配结果', description: '请尝试其他关键词。' });
      return;
    }
    const currentIndex = searchHits.findIndex((item) => item.id === activeSegmentId);
    const next = searchHits[(currentIndex + 1) % searchHits.length];
    setActiveSegment(next.id);
  };

  const statusColor =
    recordingState === 'error'
      ? 'bg-red-50 text-red-700 border-red-200'
      : recordingState === 'recording'
      ? 'bg-red-50 text-red-700 border-red-200'
      : recordingState === 'transcribing' || recordingState === 'extracting'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  return (
    <div
      className="relative flex h-full flex-col bg-white"
      ref={paneRef}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.code === 'Space' && event.target === paneRef.current) {
          event.preventDefault();
          void toggleRecording();
        }
      }}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-slate-800">家访录音</h2>
          <div className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${statusColor}`}>
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></div>
            {recordingLabel}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="打开转录菜单"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {menuOpen ? (
            <div className="absolute right-6 top-12 z-10 w-44 rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-lg">
              <button
                className="w-full rounded px-2 py-1.5 text-left hover:bg-slate-100"
                onClick={() => {
                  pushToast({ type: 'info', title: '导出占位', description: '导出转写功能待接入 API。' });
                  setMenuOpen(false);
                }}
                aria-label="导出转写"
              >
                导出转写
              </button>
              <button
                className="w-full rounded px-2 py-1.5 text-left hover:bg-slate-100"
                onClick={() => {
                  setSearchKeyword('');
                  setActiveSegment(undefined);
                  setMenuOpen(false);
                }}
                aria-label="清空搜索"
              >
                清空搜索
              </button>
              <button
                className="w-full rounded px-2 py-1.5 text-left hover:bg-slate-100"
                onClick={() => {
                  pushToast({ type: 'warning', title: 'API 未接入', description: '重新生成转写需要 /api/transcribe' });
                  setMenuOpen(false);
                }}
                aria-label="重新生成转写"
              >
                重新生成转写
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => void toggleRecording()}
            aria-label={recordingState === 'recording' ? '结束录音' : '开始录音'}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              recordingState === 'recording'
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow'
            }`}
          >
            {recordingState === 'recording' ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {recordingState === 'recording' ? '结束录音' : '开始录音'}
          </button>
          {recordingState === 'recording' ? (
            <div className="flex items-center gap-2 font-mono text-sm text-slate-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500"></span>
              {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
              {String(recordingSeconds % 60).padStart(2, '0')}
            </div>
          ) : null}
        </div>
        <div className="mt-2 flex items-center gap-2 sm:mt-0">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={transcriptSearchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-2 text-sm"
              placeholder="搜索转录关键词..."
              aria-label="搜索转录关键词"
            />
          </div>
          <button
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100"
            onClick={jumpToNextHit}
            aria-label="跳到下一个搜索结果"
          >
            下一条匹配
          </button>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto scroll-smooth ${settings.compactMode ? 'p-4' : 'p-6'}`}>
        {transcript.length === 0 ? (
          <div className="mx-auto mt-16 max-w-xl rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            当前未选择会话，或会话转录为空。
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-6">
            {transcript.map((turn, idx) => {
              const isKeywordHit = transcriptSearchKeyword.trim() && turn.text.includes(transcriptSearchKeyword.trim());
              const isActive = activeSegmentId === turn.id;
              return (
                <motion.div
                  key={turn.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: settings.reducedMotion ? 0 : idx * 0.05 }}
                  className={`group flex gap-4 rounded-md ${isActive ? 'bg-blue-50/70' : ''}`}
                  onClick={() => setActiveSegment(turn.id)}
                >
                  <div className="w-12 flex-shrink-0 pt-1 text-right">
                    <span className="font-mono text-xs text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
                      {String(Math.floor(turn.startTime / 60)).padStart(2, '0')}:
                      {String(turn.startTime % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          turn.speaker === 'social_worker' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {turn.speaker === 'social_worker' ? '社工（你）' : '长者'}
                      </span>
                      {turn.risk ? (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] ${
                            turn.risk === 'high'
                              ? 'bg-red-100 text-red-700'
                              : turn.risk === 'medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {turn.risk}
                        </span>
                      ) : null}
                    </div>
                    <div className="leading-relaxed text-slate-700">
                      {isKeywordHit ? <span className="rounded bg-blue-100 px-1 py-0.5 text-blue-800">{turn.text}</span> : turn.text}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
