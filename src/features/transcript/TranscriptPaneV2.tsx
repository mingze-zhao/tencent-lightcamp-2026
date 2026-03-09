import { Mic, MoreVertical, Search, Square } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from 'react';
import { useAppStore } from '@/state/appStore';
import type { SourceRef, StructuredItemType, TranscriptSegment } from '@/types';

interface SegmentPiece {
  text: string;
  ref?: SourceRef;
}

interface QuickAddState {
  x: number;
  y: number;
  segmentId: string;
  selectedText: string;
  range: { startChar: number; endChar: number };
}

const formatClock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

const triggerDownload = (filename: string, contentType: string, content: string) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

function splitByRefs(segment: TranscriptSegment, refs: SourceRef[]): SegmentPiece[] {
  if (!refs.length) return [{ text: segment.text }];
  const sorted = refs.slice().sort((a, b) => a.startChar - b.startChar);
  const pieces: SegmentPiece[] = [];
  let cursor = 0;
  sorted.forEach((ref) => {
    if (ref.startChar > cursor) pieces.push({ text: segment.text.slice(cursor, ref.startChar) });
    pieces.push({ text: segment.text.slice(ref.startChar, ref.endChar + 1), ref });
    cursor = ref.endChar + 1;
  });
  if (cursor < segment.text.length) pieces.push({ text: segment.text.slice(cursor) });
  return pieces;
}

export default function TranscriptPaneV2() {
  const {
    state: {
      selectedSession,
      recordingState,
      recordingSeconds,
      transcriptSearchKeyword,
      activeSegmentId,
      activeSourceRefId,
      isEditMode,
      settings,
    },
    setSearchKeyword,
    setActiveSegment,
    setActiveSourceRef,
    toggleRecording,
    appendTranscriptAndGenerate,
    pushToast,
    updateTranscriptSegmentText,
    quickAddStructuredFromTranscript,
  } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [appendText, setAppendText] = useState('');
  const [quickAdd, setQuickAdd] = useState<QuickAddState | null>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const segmentRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const longPressTimerRef = useRef<number | null>(null);
  const transcript = selectedSession?.transcript ?? [];
  const extract = selectedSession?.extractResult;
  const sourceRefs = selectedSession?.sourceRefs ?? [];

  const handleExportTxt = () => {
    if (!selectedSession) {
      pushToast({ type: 'warning', title: 'No session selected' });
      setMenuOpen(false);
      return;
    }
    const header = [
      `Session: ${selectedSession.id}`,
      `Date: ${selectedSession.date}`,
      `Elder: ${selectedSession.elderId}`,
      '',
    ];
    const lines = selectedSession.transcript.map(
      (segment) =>
        `[${formatClock(segment.startTime)}-${formatClock(segment.endTime)}] [${
          segment.speaker === 'social_worker' ? 'SW' : 'Elder'
        }] ${segment.text}`
    );
    triggerDownload(
      `transcript-${selectedSession.id}.txt`,
      'text/plain;charset=utf-8',
      [...header, ...lines].join('\n')
    );
    pushToast({ type: 'success', title: 'Exported TXT' });
    setMenuOpen(false);
  };

  const handleExportJson = () => {
    if (!selectedSession) {
      pushToast({ type: 'warning', title: 'No session selected' });
      setMenuOpen(false);
      return;
    }
    const payload = {
      id: selectedSession.id,
      elderId: selectedSession.elderId,
      date: selectedSession.date,
      duration: selectedSession.duration,
      transcript: selectedSession.transcript,
      sourceRefs: selectedSession.sourceRefs ?? [],
      extractResult: selectedSession.extractResult ?? null,
      bodyMapSnapshot: selectedSession.bodyMapSnapshot ?? null,
      report: selectedSession.report ?? '',
    };
    triggerDownload(
      `session-${selectedSession.id}.json`,
      'application/json;charset=utf-8',
      `${JSON.stringify(payload, null, 2)}\n`
    );
    pushToast({ type: 'success', title: 'Exported JSON' });
    setMenuOpen(false);
  };

  const searchHits = useMemo(() => {
    if (!transcriptSearchKeyword.trim()) return [];
    return transcript.filter((segment) => segment.text.includes(transcriptSearchKeyword.trim()));
  }, [transcript, transcriptSearchKeyword]);

  const refsBySegment = useMemo(
    () =>
      sourceRefs.reduce<Record<string, SourceRef[]>>((acc, ref) => {
        acc[ref.segmentId] = [...(acc[ref.segmentId] ?? []), ref];
        return acc;
      }, {}),
    [sourceRefs]
  );

  const linkedSegmentIds = useMemo(() => {
    const set = new Set<string>();
    if (!extract) return set;
    extract.warningSegmentIds?.forEach((ids) => ids.forEach((id) => set.add(id)));
    [extract.medication, extract.diet, extract.emotion, extract.adl, extract.social_support].forEach((d) =>
      d.sourceSegmentIds?.forEach((id) => set.add(id))
    );
    extract.symptoms.forEach((s) => s.sourceSegmentIds?.forEach((id) => set.add(id)));
    extract.action_items.forEach((a) => a.sourceSegmentIds?.forEach((id) => set.add(id)));
    return set;
  }, [extract]);

  const openQuickAddForSegment = (event: ReactMouseEvent | ReactTouchEvent, segment: TranscriptSegment) => {
    if (!selectedSession || !isEditMode) return;
    const selectionText = window.getSelection?.()?.toString().trim() ?? '';
    const selectedText = selectionText || segment.text;
    const foundStart = segment.text.indexOf(selectedText);
    const startChar = foundStart >= 0 ? foundStart : 0;
    const endChar = Math.min(segment.text.length - 1, startChar + Math.max(selectedText.length - 1, 0));
    const point =
      'touches' in event && event.touches.length > 0
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
        : 'changedTouches' in event && event.changedTouches.length > 0
        ? { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }
        : { x: (event as ReactMouseEvent).clientX, y: (event as ReactMouseEvent).clientY };
    setQuickAdd({
      x: point.x,
      y: point.y,
      segmentId: segment.id,
      selectedText,
      range: { startChar, endChar },
    });
  };

  const triggerQuickAdd = (type: StructuredItemType) => {
    if (!quickAdd || !selectedSession) return;
    void quickAddStructuredFromTranscript(
      selectedSession.id,
      quickAdd.segmentId,
      quickAdd.selectedText,
      type,
      quickAdd.range
    );
    pushToast({ type: 'success', title: '已新增结构化条目', description: `类型：${type}` });
    setQuickAdd(null);
  };

  useEffect(() => {
    if (!activeSegmentId) return;
    segmentRefsMap.current.get(activeSegmentId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeSegmentId]);

  useEffect(
    () => () => {
      if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    },
    []
  );

  const recordingLabel = {
    idle: 'Idle',
    recording: 'Recording',
    transcribing: 'Transcribing',
    extracting: 'Extracting',
    completed: 'Completed',
    error: 'Error',
  }[recordingState];

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
        if (event.key === 'Escape') setQuickAdd(null);
      }}
      onClick={() => {
        if (quickAdd) setQuickAdd(null);
      }}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-slate-800">Transcript</h2>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs">{recordingLabel}</div>
        </div>
        <button className="rounded-md p-2 text-slate-400 hover:bg-slate-100" onClick={() => setMenuOpen((prev) => !prev)}>
          <MoreVertical className="h-5 w-5" />
        </button>
        {menuOpen ? (
          <div className="absolute right-6 top-12 z-10 w-44 rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-lg">
            <button
              className="w-full rounded px-2 py-1.5 text-left hover:bg-slate-100"
              onClick={handleExportTxt}
            >
              Export as TXT
            </button>
            <button className="w-full rounded px-2 py-1.5 text-left hover:bg-slate-100" onClick={handleExportJson}>
              Export as JSON
            </button>
            <button
              className="w-full rounded px-2 py-1.5 text-left hover:bg-slate-100"
              onClick={() => {
                setSearchKeyword('');
                setMenuOpen(false);
              }}
            >
              Clear search
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => void toggleRecording()}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm ${recordingState === 'recording' ? 'bg-red-100 text-red-700' : 'bg-blue-600 text-white'}`}
          >
            {recordingState === 'recording' ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {recordingState === 'recording' ? 'Stop' : 'Record'}
          </button>
          {recordingState === 'recording' ? <span className="font-mono text-sm">{String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={transcriptSearchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-2 text-sm"
              placeholder="Search..."
            />
          </div>
          <button
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100"
            onClick={() => {
              if (searchHits.length === 0) return;
              const currentIndex = searchHits.findIndex((item) => item.id === activeSegmentId);
              setActiveSegment(searchHits[(currentIndex + 1) % searchHits.length].id);
            }}
          >
            Next
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-2">
        <input
          value={appendText}
          onChange={(event) => setAppendText(event.target.value)}
          placeholder="Append one sentence for incremental extraction..."
          className="flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
        />
        <button
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white"
          onClick={() => {
            if (!appendText.trim()) return;
            void appendTranscriptAndGenerate(appendText.trim());
            setAppendText('');
          }}
        >
          Incremental
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto scroll-smooth ${settings.compactMode ? 'p-4' : 'p-6'}`}>
        {transcript.length === 0 ? (
          <div className="mx-auto mt-16 max-w-xl rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            No transcript.
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-6">
            {transcript.map((turn, idx) => {
              const isActive = activeSegmentId === turn.id;
              const isLinked = linkedSegmentIds.has(turn.id);
              return (
                <motion.div
                  key={turn.id}
                  ref={(el) => {
                    if (el) segmentRefsMap.current.set(turn.id, el);
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: settings.reducedMotion ? 0 : idx * 0.05 }}
                  className={`group flex gap-4 rounded-md border-l-4 ${isActive ? 'border-blue-400 bg-blue-50/70' : isLinked ? 'border-amber-400 bg-amber-50/50' : 'border-transparent'}`}
                  onClick={() => setActiveSegment(turn.id)}
                  onMouseDown={(event) => {
                    if (!isEditMode) return;
                    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = window.setTimeout(() => openQuickAddForSegment(event, turn), 500);
                  }}
                  onMouseUp={() => {
                    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
                  }}
                  onMouseLeave={() => {
                    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
                  }}
                  onTouchStart={(event) => {
                    if (!isEditMode) return;
                    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = window.setTimeout(() => openQuickAddForSegment(event, turn), 500);
                  }}
                  onTouchEnd={() => {
                    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
                  }}
                >
                  <div className="w-12 flex-shrink-0 pt-1 text-right text-xs text-slate-400">
                    {formatClock(turn.startTime)}
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${turn.speaker === 'social_worker' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}>
                        {turn.speaker === 'social_worker' ? 'SW' : 'Elder'}
                      </span>
                    </div>
                    <div className="leading-relaxed text-slate-700">
                      {isEditMode ? (
                        <textarea
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm"
                          value={turn.text}
                          onChange={(event) => updateTranscriptSegmentText(selectedSession!.id, turn.id, event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                        />
                      ) : null}
                      {!isEditMode
                        ? splitByRefs(turn, refsBySegment[turn.id] ?? []).map((piece, pieceIdx) => {
                            if (piece.ref) {
                              const ref = piece.ref;
                              return (
                                <button
                                  key={ref.id}
                                  className={`rounded px-1 py-0.5 ${
                                    activeSourceRefId === ref.id
                                      ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300'
                                      : 'bg-amber-100 text-amber-900'
                                  }`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setActiveSegment(turn.id);
                                    setActiveSourceRef(ref.id);
                                  }}
                                >
                                  {piece.text}
                                </button>
                              );
                            }
                            return (
                              <span
                                key={`${turn.id}-${pieceIdx}`}
                                className={
                                  transcriptSearchKeyword.trim() && piece.text.includes(transcriptSearchKeyword.trim())
                                    ? 'rounded bg-blue-100 px-1 py-0.5 text-blue-800'
                                    : ''
                                }
                              >
                                {piece.text}
                              </span>
                            );
                          })
                        : null}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      {quickAdd ? (
        <div
          className="fixed z-30 min-w-44 rounded-lg border border-slate-200 bg-white p-1 text-xs shadow-xl"
          style={{ left: Math.min(quickAdd.x, window.innerWidth - 190), top: Math.min(quickAdd.y, window.innerHeight - 220) }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="px-2 py-1 text-[11px] text-slate-500">Quick Add</div>
          {(
            [
              ['warning', 'Warning'],
              ['insight', 'Insight Block'],
              ['action_item', 'Action Item'],
              ['body_finding', 'Body Finding'],
              ['dimension', 'Dimension'],
            ] as Array<[StructuredItemType, string]>
          ).map(([type, label]) => (
            <button
              key={type}
              className="block w-full rounded px-2 py-1.5 text-left hover:bg-slate-100"
              onClick={() => triggerQuickAdd(type)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
