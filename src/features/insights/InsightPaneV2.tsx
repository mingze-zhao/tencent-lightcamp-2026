import { AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '@/state/appStore';
import BodyMapPanel from './BodyMapPanel';
import VisitTimelineSlider from './VisitTimelineSlider';
import type { InsightBlock, SourceRef } from '@/types';
import DimensionSummariesBoard from '@/features/shared/DimensionSummariesBoard';
import { ActionItemsList, WarningsList } from '@/features/shared/StructuredInsightPanels';

const riskBadgeMap = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-emerald-100 text-emerald-700',
};

const riskLabelMap = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
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
  const warningItems = useMemo(() => {
    if (!extract) return [];
    return (extract.warnings ?? []).map((warning, idx) => ({
      id: extract.warningItems?.[idx]?.id ?? `warning-${idx + 1}`,
      content: warning,
      severity: extract.warningItems?.[idx]?.severity ?? 'medium',
      sourceRefIds: extract.warningItems?.[idx]?.sourceRefIds ?? [],
      sourceSegmentIds: extract.warningItems?.[idx]?.sourceSegmentIds ?? extract.warningSegmentIds?.[idx] ?? [],
    }));
  }, [extract]);
  const actionItems = useMemo(() => extract?.action_items ?? [], [extract]);
  const insightBlocks: InsightBlock[] = useMemo(() => extract?.insightBlocks ?? [], [extract]);
  const dimensionSummaries = useMemo(() => {
    if (!extract) return [];
    if (extract.dimensionSummaries && extract.dimensionSummaries.length > 0) return extract.dimensionSummaries;
    return [
      {
        id: 'fallback-medication',
        dimension: 'medication',
        summary: extract.medication.summary,
        risk: extract.medication.risk,
        details: extract.medication.details,
        sourceSegmentIds: extract.medication.sourceSegmentIds,
      },
      {
        id: 'fallback-diet',
        dimension: 'diet',
        summary: extract.diet.summary,
        risk: extract.diet.risk,
        details: extract.diet.details,
        sourceSegmentIds: extract.diet.sourceSegmentIds,
      },
      {
        id: 'fallback-emotion',
        dimension: 'emotion',
        summary: extract.emotion.summary,
        risk: extract.emotion.risk,
        details: extract.emotion.details,
        sourceSegmentIds: extract.emotion.sourceSegmentIds,
      },
      {
        id: 'fallback-adl',
        dimension: 'adl',
        summary: extract.adl.summary,
        risk: extract.adl.risk,
        details: extract.adl.details,
        sourceSegmentIds: extract.adl.sourceSegmentIds,
      },
      {
        id: 'fallback-social',
        dimension: 'social_support',
        summary: extract.social_support.summary,
        risk: extract.social_support.risk,
        details: extract.social_support.details,
        sourceSegmentIds: extract.social_support.sourceSegmentIds,
      },
    ];
  }, [extract]);
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
    if (warningItems.some((item) => has(item.sourceSegmentIds))) {
      warningsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (extract.insightBlocks?.some((block) => block.sourceRefIds.some((id) => sourceRefMap[id]?.segmentId === activeSegmentId))) {
      blocksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (actionItems.some((item) => has(item.sourceSegmentIds))) {
      actionItemsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeSegmentId, extract, sourceRefMap, warningItems, actionItems]);

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
        <h2 className="text-lg font-bold text-slate-800">🧠 个案洞察板</h2>
        <button className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600" onClick={() => void runExtractAndReport()}>
          生成洞察
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
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            请先选择一条会话记录。
          </div>
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
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-base font-bold text-slate-800">人体图（正面/背面）</div>
              <div className="grid gap-3 lg:grid-cols-2">
                <BodyMapPanel
                  title="正面"
                  hideLegend
                  fixedBodySide="anterior"
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
                <BodyMapPanel
                  title="背面"
                  hideLegend
                  fixedBodySide="posterior"
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
              </div>
              <div className="mt-3 flex gap-2 text-xs text-slate-600">
                <span className="rounded bg-red-100 px-1.5 py-0.5">新发</span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5">持续</span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5">痊愈</span>
              </div>
            </div>

            <motion.div ref={warningsRef} className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-base font-bold text-red-800">
                <AlertCircle className="h-5 w-5" />
                <h3>🚨 风险预警 ({warningItems.length})</h3>
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
              <WarningsList
                items={warningItems}
                sourceRefMap={sourceRefMap}
                sourceRefsBySegment={sourceRefsBySegment}
                activeSourceRefId={activeSourceRefId}
                onJumpToSource={(sourceRefId, segmentId) => {
                  if (sourceRefId) setActiveSourceRef(sourceRefId);
                  if (segmentId) setActiveSegment(segmentId);
                }}
                registerSourceButton={(sourceRefId, el) => {
                  if (el) sourceRefItemRefs.current.set(sourceRefId, el);
                }}
                isEditMode={isEditMode}
                onEditContent={(_, idx, value) => {
                  if (!selectedSession) return;
                  updateWarningContent(selectedSession.id, idx, value);
                }}
                onDelete={(_, idx) => {
                  if (!selectedSession) return;
                  void deleteStructuredItem(selectedSession.id, 'warning', idx);
                }}
              />
            </motion.div>

            <motion.div ref={blocksRef} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-base font-bold text-slate-800">
                <span>🧩 洞察模块（含来源）</span>
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
                  <div className="text-xs text-slate-400">暂无洞察模块。</div>
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
                        <span className={`rounded px-1.5 py-0.5 text-xs ${riskBadgeMap[block.risk]}`}>
                          {riskLabelMap[block.risk]}
                        </span>
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
                              className={`rounded border px-1.5 py-0.5 text-xs ${active ? 'border-blue-300 bg-blue-100 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}
                              onClick={() => {
                                setActiveSourceRef(source.id);
                                setActiveSegment(source.segmentId);
                              }}
                            >
                              来源：{source.text}
                            </button>
                          );
                        })}
                      </div>
                      {isEditMode ? (
                        <button
                          className="mt-2 inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700"
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
              <DimensionSummariesBoard
                title="📊 维度总结"
                items={dimensionSummaries}
                sourceRefs={sourceRefs}
                onJumpToSource={(sourceRefId, segmentId) => {
                  if (sourceRefId) {
                    const source = sourceRefMap[sourceRefId];
                    if (source) {
                      setActiveSourceRef(source.id);
                      setActiveSegment(source.segmentId);
                      return;
                    }
                  }
                  if (segmentId) setActiveSegment(segmentId);
                }}
                isEditMode={isEditMode}
                onDeleteItem={(itemId) => {
                  if (!selectedSession || !isEditMode) return;
                  void deleteStructuredItem(selectedSession.id, 'dimension', itemId);
                }}
                headerRight={
                  isEditMode ? (
                    <button
                      className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                      onClick={() => selectedSession && void addStructuredItem(selectedSession.id, 'dimension')}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      新增
                    </button>
                  ) : null
                }
              />
            </motion.div>

            <motion.div ref={actionItemsRef} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">✅ 跟进行动</h3>
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
              <div className="p-4">
                <ActionItemsList
                  items={actionItems}
                  sourceRefMap={sourceRefMap}
                  sourceRefsBySegment={sourceRefsBySegment}
                  activeSourceRefId={activeSourceRefId}
                  onJumpToSource={(sourceRefId, segmentId) => {
                    if (sourceRefId) setActiveSourceRef(sourceRefId);
                    if (segmentId) setActiveSegment(segmentId);
                  }}
                  registerSourceButton={(sourceRefId, el) => {
                    if (el) sourceRefItemRefs.current.set(sourceRefId, el);
                  }}
                  showCheckbox
                  enableRemarks
                  remarksStorageKey={selectedSession ? `workbench-action-remarks:${selectedSession.id}` : undefined}
                  isEditMode={isEditMode}
                  onToggleChecked={(item, checked) => {
                    if (selectedSession) {
                      updateActionItemFields(selectedSession.id, item.id, { checked });
                    } else {
                      void toggleActionItem(item.id, checked);
                    }
                  }}
                  onEditContent={(item, value) => {
                    if (!selectedSession) return;
                    updateActionItemFields(selectedSession.id, item.id, { content: value });
                  }}
                  onDelete={(item) => {
                    if (!selectedSession) return;
                    void deleteStructuredItem(selectedSession.id, 'action_item', item.id);
                  }}
                />
              </div>
            </motion.div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800">📝 报告预览</h3>
                <button
                  className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                  onClick={() => {
                    if (!selectedSession.report) {
                      pushToast({ type: 'warning', title: '暂无报告' });
                      return;
                    }
                    void navigator.clipboard.writeText(selectedSession.report);
                    pushToast({ type: 'success', title: '已复制' });
                  }}
                >
                  复制
                </button>
              </div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-slate-700">
                {selectedSession.report ?? (recordingState === 'extracting' ? '正在生成报告...' : '暂无报告内容。')}
              </pre>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
