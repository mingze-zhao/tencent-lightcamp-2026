import { AlertCircle, CheckCircle2, Clock, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '@/state/appStore';
import BodyMapPanel from './BodyMapPanel';
import VisitTimelineSlider from './VisitTimelineSlider';
import type { InsightBlock, SourceRef } from '@/types';

const riskBadgeMap = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-emerald-100 text-emerald-700',
};

export default function InsightPaneV2() {
  const {
    state: {
      selectedSession,
      selectedSessionId,
      selectedElderId,
      sessionsByElder,
      status,
      recordingState,
      isEditMode,
      settings,
      activeSegmentId,
      activeSourceRefId,
    },
    runExtractAndReport,
    toggleActionItem,
    setActiveSegment,
    setActiveSourceRef,
    selectSession,
    pushToast,
    updateInsightBlockFields,
    updateWarningContent,
    updateBodyFindingFields,
    updateActionItemFields,
    addStructuredItem,
    deleteStructuredItem,
  } = useAppStore();

  const extract = selectedSession?.extractResult;
  const sourceRefs = selectedSession?.sourceRefs ?? [];
  const sessions = selectedElderId ? sessionsByElder[selectedElderId] ?? [] : [];
  const warningsRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<HTMLDivElement>(null);
  const actionItemsRef = useRef<HTMLDivElement>(null);
  const sourceRefItemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const sourceRefMap = useMemo(
    () =>
      sourceRefs.reduce<Record<string, SourceRef>>((acc, ref) => {
        acc[ref.id] = ref;
        return acc;
      }, {}),
    [sourceRefs]
  );
  const insightBlocks: InsightBlock[] = useMemo(() => extract?.insightBlocks ?? [], [extract]);
  const sourceRefsBySegment = useMemo(
    () =>
      sourceRefs.reduce<Record<string, SourceRef[]>>((acc, ref) => {
        acc[ref.segmentId] = [...(acc[ref.segmentId] ?? []), ref];
        return acc;
      }, {}),
    [sourceRefs]
  );

  useEffect(() => {
    if (!activeSourceRefId) return;
    sourceRefItemRefs.current.get(activeSourceRefId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeSourceRefId]);

  useEffect(() => {
    if (!activeSegmentId || !extract) return;
    const has = (arr: string[] | undefined) => arr?.includes(activeSegmentId);
    if (extract.warningSegmentIds?.some((arr) => arr.includes(activeSegmentId))) {
      warningsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (extract.insightBlocks?.some((block) => block.sourceRefIds.some((id) => sourceRefMap[id]?.segmentId === activeSegmentId))) {
      blocksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (extract.action_items.some((a) => has(a.sourceSegmentIds))) {
      actionItemsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeSegmentId, extract, sourceRefMap]);

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
        <h2 className="font-semibold text-slate-800">Insight Board</h2>
        <button className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600" onClick={() => void runExtractAndReport()}>
          Generate
        </button>
      </div>

      <div className={`flex-1 space-y-6 overflow-y-auto scroll-smooth ${settings.compactMode ? 'p-4' : 'p-6'}`}>
        {status === 'loading' ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-28 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
          </div>
        ) : null}

        {status !== 'loading' && !selectedSession ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No session selected.</div>
        ) : null}

        {selectedSession ? (
          <>
            <VisitTimelineSlider sessions={sessions} selectedSessionId={selectedSessionId} onSelectSession={selectSession} />
            {isEditMode ? (
              <div className="-mb-4 flex justify-end">
                <button
                  className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                  onClick={() => void addStructuredItem(selectedSession.id, 'body_finding')}
                >
                  <Plus className="h-3.5 w-3.5" />
                  新增身体发现
                </button>
              </div>
            ) : null}
            <BodyMapPanel
              findings={selectedSession.bodyMapSnapshot?.findings ?? []}
              activeSourceRefId={activeSourceRefId}
              isEditMode={isEditMode}
              onSelectFinding={(finding) => {
                const sourceId = finding.sourceRefIds[0];
                if (!sourceId) return;
                const source = sourceRefMap[sourceId];
                if (!source) return;
                setActiveSourceRef(source.id);
                setActiveSegment(source.segmentId);
              }}
              onEditFinding={(findingId, patch) => {
                if (!selectedSession) return;
                updateBodyFindingFields(selectedSession.id, findingId, patch);
              }}
              onDeleteFinding={(findingId) => {
                if (!selectedSession || !isEditMode) return;
                void deleteStructuredItem(selectedSession.id, 'body_finding', findingId);
              }}
            />

            <motion.div ref={warningsRef} className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 font-semibold text-red-800">
                <AlertCircle className="h-5 w-5" />
                <h3>Warnings ({extract?.warnings.length ?? 0})</h3>
                {isEditMode ? (
                  <button
                    className="ml-auto inline-flex items-center gap-1 rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-700"
                    onClick={() => selectedSession && void addStructuredItem(selectedSession.id, 'warning')}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    新增
                  </button>
                ) : null}
              </div>
              {extract?.warnings.length ? (
                <div className="space-y-2">
                  {extract.warnings.map((warning, idx) => {
                    const firstSegmentId = extract.warningSegmentIds?.[idx]?.[0];
                    const refs = (extract.warningSegmentIds?.[idx] ?? []).flatMap(
                      (segmentId) => sourceRefsBySegment[segmentId] ?? []
                    );
                    return (
                      <div
                        key={`${idx}-${warning}`}
                        className="flex w-full items-start gap-3 rounded-lg border border-red-100 bg-white p-3 text-left"
                        role="button"
                        tabIndex={0}
                        onClick={() => firstSegmentId && setActiveSegment(firstSegmentId)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && firstSegmentId) setActiveSegment(firstSegmentId);
                        }}
                      >
                        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                        <div className="flex-1">
                          {isEditMode ? (
                            <input
                              className="w-full rounded border border-red-200 bg-white px-2 py-1 text-sm text-slate-800"
                              value={warning}
                              onChange={(event) =>
                                selectedSession && updateWarningContent(selectedSession.id, idx, event.target.value)
                              }
                            />
                          ) : (
                            <p className="text-sm font-medium text-slate-800">{warning}</p>
                          )}
                          <div className="mt-1 flex flex-wrap gap-1">
                            {refs.map((source) => (
                              <button
                                key={source.id}
                                ref={(el) => {
                                  if (el) sourceRefItemRefs.current.set(source.id, el);
                                }}
                                className={`rounded border px-1.5 py-0.5 text-[10px] ${
                                  activeSourceRefId === source.id
                                    ? 'border-blue-300 bg-blue-100 text-blue-700'
                                    : 'border-red-200 bg-red-100 text-red-700'
                                }`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setActiveSourceRef(source.id);
                                  setActiveSegment(source.segmentId);
                                }}
                              >
                                Source: {source.text}
                              </button>
                            ))}
                          </div>
                          {isEditMode ? (
                            <button
                              className="mt-2 inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] text-red-700"
                              onClick={(event) => {
                                event.stopPropagation();
                                selectedSession && void deleteStructuredItem(selectedSession.id, 'warning', idx);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                              删除
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-red-200 bg-white p-3 text-xs text-slate-500">No warning.</div>
              )}
            </motion.div>

            <motion.div ref={blocksRef} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span>Generated Blocks (with source references)</span>
                {isEditMode ? (
                  <button
                    className="ml-auto inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                    onClick={() => selectedSession && void addStructuredItem(selectedSession.id, 'insight')}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    新增
                  </button>
                ) : null}
              </div>
              <div className="space-y-2">
                {insightBlocks.length === 0 ? (
                  <div className="text-xs text-slate-400">No generated block yet.</div>
                ) : (
                  insightBlocks.map((block) => (
                    <div
                      key={block.id}
                      className={`rounded-lg border p-3 ${
                        block.risk === 'high'
                          ? 'border-red-200 bg-red-50'
                          : block.risk === 'medium'
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-emerald-200 bg-emerald-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {isEditMode ? (
                          <input
                            className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-800"
                            value={block.title}
                            onChange={(event) =>
                              selectedSession &&
                              updateInsightBlockFields(selectedSession.id, block.id, { title: event.target.value })
                            }
                          />
                        ) : (
                          <div className="text-sm font-medium text-slate-800">{block.title}</div>
                        )}
                        <span className={`rounded px-1.5 py-0.5 text-[10px] ${riskBadgeMap[block.risk]}`}>{block.risk}</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        {isEditMode ? (
                          <textarea
                            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm"
                            value={block.summary}
                            onChange={(event) =>
                              selectedSession &&
                              updateInsightBlockFields(selectedSession.id, block.id, { summary: event.target.value })
                            }
                          />
                        ) : (
                          block.summary
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {block.sourceRefIds.map((sourceId) => {
                          const source = sourceRefMap[sourceId];
                          if (!source) return null;
                          const active = activeSourceRefId === source.id;
                          return (
                            <button
                              key={source.id}
                              ref={(el) => {
                                if (el) sourceRefItemRefs.current.set(source.id, el);
                              }}
                              className={`rounded border px-1.5 py-0.5 text-[10px] ${active ? 'border-blue-300 bg-blue-100 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}
                              onClick={() => {
                                setActiveSourceRef(source.id);
                                setActiveSegment(source.segmentId);
                              }}
                            >
                              Source: {source.text}
                            </button>
                          );
                        })}
                      </div>
                      {isEditMode ? (
                        <button
                          className="mt-2 inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] text-red-700"
                          onClick={() => selectedSession && void deleteStructuredItem(selectedSession.id, 'insight', block.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          删除
                        </button>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            <motion.div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span>Dimension Summaries</span>
                {isEditMode ? (
                  <button
                    className="ml-auto inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                    onClick={() => selectedSession && void addStructuredItem(selectedSession.id, 'dimension')}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    新增
                  </button>
                ) : null}
              </div>
              <div className="space-y-2">
                {(extract?.dimensionSummaries ?? []).length === 0 ? (
                  <div className="text-xs text-slate-400">No dimension summary yet.</div>
                ) : (
                  (extract?.dimensionSummaries ?? []).map((item) => (
                    <div key={item.id} className="rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                      <div className="font-semibold">{item.dimension}</div>
                      <div className="mt-1">{item.summary}</div>
                      {isEditMode ? (
                        <button
                          className="mt-2 inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] text-red-700"
                          onClick={() => selectedSession && void deleteStructuredItem(selectedSession.id, 'dimension', item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          删除
                        </button>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            <motion.div ref={actionItemsRef} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-slate-800">Action Items</h3>
                {isEditMode ? (
                  <button
                    className="ml-auto inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                    onClick={() => selectedSession && void addStructuredItem(selectedSession.id, 'action_item')}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    新增
                  </button>
                ) : null}
              </div>
              {extract?.action_items.length ? (
                <div className="divide-y divide-slate-100">
                  {extract.action_items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 p-4 ${item.sourceSegmentIds?.length ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                      onClick={(e) => {
                        if (item.sourceSegmentIds?.[0] && (e.target as HTMLElement).closest('input')?.getAttribute('type') !== 'checkbox') {
                          setActiveSegment(item.sourceSegmentIds[0]);
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.status === 'completed'}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                        onChange={(event) => {
                          event.stopPropagation();
                          if (selectedSession) {
                            updateActionItemFields(selectedSession.id, item.id, { checked: event.target.checked });
                          } else {
                            void toggleActionItem(item.id, event.target.checked);
                          }
                        }}
                      />
                      <div className="flex-1">
                        {isEditMode ? (
                          <input
                            className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-800"
                            value={item.content}
                            onChange={(event) =>
                              selectedSession &&
                              updateActionItemFields(selectedSession.id, item.id, { content: event.target.value })
                            }
                          />
                        ) : (
                          <p className="text-sm font-medium text-slate-800">{item.content}</p>
                        )}
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${riskBadgeMap[item.priority]}`}>{item.priority}</span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="h-3 w-3" />
                            {item.status === 'completed' ? 'Done' : 'Pending'}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(item.sourceSegmentIds ?? [])
                            .flatMap((segmentId) => sourceRefsBySegment[segmentId] ?? [])
                            .map((source) => (
                              <button
                                key={source.id}
                                ref={(el) => {
                                  if (el) sourceRefItemRefs.current.set(source.id, el);
                                }}
                                className={`rounded border px-1.5 py-0.5 text-[10px] ${
                                  activeSourceRefId === source.id
                                    ? 'border-blue-300 bg-blue-100 text-blue-700'
                                    : 'border-slate-200 bg-white text-slate-600'
                                }`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setActiveSourceRef(source.id);
                                  setActiveSegment(source.segmentId);
                                }}
                              >
                                Source: {source.text}
                              </button>
                            ))}
                        </div>
                        {isEditMode ? (
                          <button
                            className="mt-2 inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] text-red-700"
                            onClick={(event) => {
                              event.stopPropagation();
                              selectedSession && void deleteStructuredItem(selectedSession.id, 'action_item', item.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                            删除
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-sm text-slate-500">No action item.</div>
              )}
            </motion.div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Report Preview</h3>
                <button
                  className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                  onClick={() => {
                    if (!selectedSession.report) {
                      pushToast({ type: 'warning', title: 'No report' });
                      return;
                    }
                    void navigator.clipboard.writeText(selectedSession.report);
                    pushToast({ type: 'success', title: 'Copied' });
                  }}
                >
                  Copy
                </button>
              </div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-slate-700">
                {selectedSession.report ?? (recordingState === 'extracting' ? 'Generating report...' : 'No report content.')}
              </pre>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
