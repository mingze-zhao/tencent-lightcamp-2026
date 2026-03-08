import type { AppMode, BodyFinding, InsightBlock, RiskLevel, SourceRef, VisitSession } from '@/types';

export interface IncrementalExtractResult {
  sourceRef: SourceRef;
  insightBlock: InsightBlock;
  bodyFinding?: BodyFinding;
  warning?: string;
}

const inferRisk = (text: string): RiskLevel => {
  if (/停药|漏服|呼吸困难|严重|剧痛/.test(text)) return 'high';
  if (/肿|痛|喘|不舒服|乏力/.test(text)) return 'medium';
  return 'low';
};

const inferType = (text: string): InsightBlock['type'] => {
  if (/药|服/.test(text)) return 'medication';
  if (/痛|肿|喘|咳|痰/.test(text)) return 'symptom';
  if (/心情|情绪|担心|焦虑/.test(text)) return 'emotion';
  if (/家人|子女|探访|支持/.test(text)) return 'social';
  return 'symptom';
};

const inferBodyPart = (text: string): BodyFinding['part'] | undefined => {
  if (/左手指|左手麻|左手痛/.test(text)) return 'left_fingers';
  if (/右手指|右手麻|右手痛/.test(text)) return 'right_fingers';
  if (/左脚趾|左脚麻|左脚趾痛/.test(text)) return 'left_toes';
  if (/右脚趾|右脚麻|右脚趾痛/.test(text)) return 'right_toes';
  if (/头|晕/.test(text)) return 'head';
  if (/胸|喘|呼吸/.test(text)) return 'chest';
  if (/胃|肚/.test(text)) return 'abdomen';
  if (/左手/.test(text)) return 'left_arm';
  if (/右手/.test(text)) return 'right_arm';
  if (/左脚|左腿/.test(text)) return 'left_leg';
  if (/右脚|右腿/.test(text)) return 'right_leg';
  if (/脚|腿|膝/.test(text)) return 'right_leg';
  if (/背/.test(text)) return 'back';
  return undefined;
};

export const LLMAdapter = {
  async generateIncremental(
    session: VisitSession,
    segmentId: string,
    segmentText: string,
    mode: AppMode
  ): Promise<IncrementalExtractResult> {
    if (mode === 'live') {
      // 真实接入占位：后续可替换为调用 /api/llm/incremental-extract。
      throw new Error('实机模式增量抽取接口未接入，请配置后端 /api/llm/incremental-extract');
    }
    const clipped = segmentText.length > 20 ? segmentText.slice(0, 20) : segmentText;
    const risk = inferRisk(segmentText);
    const type = inferType(segmentText);
    const sourceRefId = `sr-${session.id}-${Date.now()}`;
    const sourceRef: SourceRef = {
      id: sourceRefId,
      segmentId,
      startChar: 0,
      endChar: Math.max(0, clipped.length - 1),
      text: clipped,
    };
    const insightBlock: InsightBlock = {
      id: `ib-${session.id}-${Date.now()}`,
      title: '增量洞察',
      type,
      risk,
      summary: clipped,
      sourceRefIds: [sourceRef.id],
    };
    const part = inferBodyPart(segmentText);
    const bodyFinding = part
      ? {
          id: `bf-${session.id}-${Date.now()}`,
          part,
          label: clipped,
          status: 'new' as const,
          risk,
          sourceRefIds: [sourceRef.id],
        }
      : undefined;
    const warning = risk === 'high' ? `增量预警：${clipped}` : undefined;
    return { sourceRef, insightBlock, bodyFinding, warning };
  },
};
