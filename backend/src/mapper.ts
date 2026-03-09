import type { ActionItemStatus, BodyFindingStatus, InsightBlockType, RecordingState, RiskLevel, Speaker } from '@prisma/client';
import type { CalendarDay, CommunityBodyStat, ElderProfile, SessionSummary, VisitSession } from './contracts.js';

const toDate = (value: Date) => value.toISOString().slice(0, 10);

export const mapElder = (elder: {
  id: string;
  name: string;
  age: number;
  gender: string;
  address: string;
  contactNumber: string;
  livingStatus: string;
  chronicDiseases: unknown;
  emergencyContactName: string;
  emergencyContactRel: string;
  emergencyContactPhone: string;
  ifDemo: boolean;
  overallRisk: RiskLevel;
  lastVisitDate: Date | null;
  tags: Array<{ tag: string }>;
}): ElderProfile => ({
  id: elder.id,
  ifDemo: elder.ifDemo,
  name: elder.name,
  age: elder.age,
  gender: elder.gender as ElderProfile['gender'],
  address: elder.address,
  contactNumber: elder.contactNumber,
  livingStatus: elder.livingStatus as ElderProfile['livingStatus'],
  chronicDiseases: (elder.chronicDiseases as string[]) ?? [],
  emergencyContact: {
    name: elder.emergencyContactName,
    relation: elder.emergencyContactRel,
    phone: elder.emergencyContactPhone,
  },
  tags: elder.tags.map((item) => item.tag),
  lastVisitDate: elder.lastVisitDate ? toDate(elder.lastVisitDate) : undefined,
  overallRisk: elder.overallRisk,
});

const dimensionFallback = { summary: '', risk: 'low' as const };

const mapStatus = (status: ActionItemStatus) => status as 'pending' | 'in_progress' | 'completed';

export const mapSession = (session: {
  id: string;
  elderId: string;
  date: Date;
  duration: number;
  ifDemo: boolean;
  status: RecordingState;
  report: string | null;
  transcript: Array<{
    id: string;
    startTime: number;
    endTime: number;
    speaker: Speaker;
    text: string;
    risk: RiskLevel | null;
    keywords: unknown;
  }>;
  sourceRefs: Array<{
    id: string;
    segmentId: string;
    startChar: number;
    endChar: number;
    text: string;
  }>;
  dimensions: Array<{
    id: string;
    dimension: string;
    summary: string;
    risk: RiskLevel;
    details: unknown;
    sourceSegmentIds: unknown;
  }>;
  symptoms: Array<{
    id: string;
    description: string;
    risk: RiskLevel;
    sourceSegmentIds: unknown;
  }>;
  warnings: Array<{
    id: string;
    content: string;
    severity: RiskLevel;
    sourceRefs: Array<{ sourceRefId: string; sourceRef: { segmentId: string } }>;
  }>;
  actionItems: Array<{
    id: string;
    content: string;
    priority: RiskLevel;
    status: ActionItemStatus;
    sourceRefs: Array<{ sourceRef: { segmentId: string } }>;
  }>;
  insightBlocks: Array<{
    id: string;
    title: string;
    type: InsightBlockType;
    risk: RiskLevel;
    summary: string;
    sourceRefs: Array<{ sourceRefId: string }>;
  }>;
  bodyFindings: Array<{
    id: string;
    bodyPart: string;
    label: string;
    status: BodyFindingStatus;
    risk: RiskLevel;
    viewSide: 'front' | 'back';
    sourceRefs: Array<{ sourceRefId: string }>;
  }>;
}): VisitSession => {
  const dimensions = session.dimensions.reduce<Record<string, { summary: string; risk: RiskLevel; details?: string[]; sourceSegmentIds?: string[] }>>(
    (acc, row) => {
      acc[row.dimension] = {
        summary: row.summary,
        risk: row.risk,
        details: (row.details as string[] | undefined) ?? undefined,
        sourceSegmentIds: (row.sourceSegmentIds as string[] | undefined) ?? undefined,
      };
      return acc;
    },
    {}
  );

  return {
    id: session.id,
    elderId: session.elderId,
    ifDemo: session.ifDemo,
    date: toDate(session.date),
    duration: session.duration,
    status: session.status as VisitSession['status'],
    transcript: session.transcript
      .slice()
      .sort((a, b) => a.startTime - b.startTime)
      .map((segment) => ({
        id: segment.id,
        startTime: segment.startTime,
        endTime: segment.endTime,
        speaker: segment.speaker as VisitSession['transcript'][number]['speaker'],
        text: segment.text,
        risk: segment.risk ?? undefined,
        keywords: (segment.keywords as string[] | undefined) ?? undefined,
      })),
    sourceRefs: session.sourceRefs.map((ref) => ({
      id: ref.id,
      segmentId: ref.segmentId,
      startChar: ref.startChar,
      endChar: ref.endChar,
      text: ref.text,
    })),
    extractResult: {
      medication: dimensions.medication ?? dimensionFallback,
      symptoms: session.symptoms.map((item) => ({
        id: item.id,
        description: item.description,
        risk: item.risk,
        sourceSegmentIds: (item.sourceSegmentIds as string[] | undefined) ?? undefined,
      })),
      diet: dimensions.diet ?? dimensionFallback,
      emotion: dimensions.emotion ?? dimensionFallback,
      adl: dimensions.adl ?? dimensionFallback,
      social_support: dimensions.social_support ?? dimensionFallback,
      action_items: session.actionItems.map((item) => ({
        id: item.id,
        content: item.content,
        priority: item.priority,
        status: mapStatus(item.status),
        sourceSegmentIds: item.sourceRefs.map((link) => link.sourceRef.segmentId),
      })),
      warnings: session.warnings.map((warning) => warning.content),
      warningSegmentIds: session.warnings.map((warning) => warning.sourceRefs.map((link) => link.sourceRef.segmentId)),
      warningItems: session.warnings.map((warning) => ({
        id: warning.id,
        content: warning.content,
        severity: warning.severity,
        sourceRefIds: warning.sourceRefs.map((link) => link.sourceRefId),
        sourceSegmentIds: warning.sourceRefs.map((link) => link.sourceRef.segmentId),
      })),
      insightBlocks: session.insightBlocks.map((block) => ({
        id: block.id,
        title: block.title,
        type: block.type as 'warning' | 'medication' | 'symptom' | 'emotion' | 'social' | 'diet' | 'adl' | 'action_item',
        risk: block.risk,
        summary: block.summary,
        sourceRefIds: block.sourceRefs.map((item) => item.sourceRefId),
      })),
      dimensionSummaries: session.dimensions.map((row) => ({
        id: row.id,
        dimension: row.dimension,
        summary: row.summary,
        risk: row.risk,
        details: (row.details as string[] | undefined) ?? undefined,
        sourceSegmentIds: (row.sourceSegmentIds as string[] | undefined) ?? undefined,
      })),
    },
    bodyMapSnapshot: {
      sessionId: session.id,
      date: toDate(session.date),
      findings: session.bodyFindings.map((finding) => ({
        id: finding.id,
        part: finding.bodyPart as
          | 'head'
          | 'chest'
          | 'abdomen'
          | 'left_arm'
          | 'right_arm'
          | 'left_fingers'
          | 'right_fingers'
          | 'left_leg'
          | 'right_leg'
          | 'left_toes'
          | 'right_toes'
          | 'back',
        label: finding.label,
        status: finding.status as 'new' | 'ongoing' | 'resolved',
        risk: finding.risk,
        sourceRefIds: finding.sourceRefs.map((item) => item.sourceRefId),
        viewSide: finding.viewSide,
      })),
    },
    report: session.report ?? undefined,
  };
};

export const mapCalendar = (rows: Array<{ date: Date; elderIds: string }>): CalendarDay[] =>
  rows.map((row) => ({ date: toDate(row.date), elderIds: JSON.parse(row.elderIds) as string[] }));

export const mapCommunityStats = (
  rows: Array<{ part: string; issueCount: bigint | number; elderCount: bigint | number; activeCount: bigint | number; resolvedCount: bigint | number; topLabels?: { name: string; count: number }[] }>,
  totalElders: number
): CommunityBodyStat[] =>
  rows.map((item) => {
    const elderCount = Number(item.elderCount);
    return {
      part: item.part,
      issueCount: Number(item.issueCount),
      elderCount,
      activeCount: Number(item.activeCount),
      resolvedCount: Number(item.resolvedCount),
      topLabels: item.topLabels,
      rate: Number((elderCount / Math.max(totalElders, 1)).toFixed(2)),
    };
  });

export const mapSessionSummary = (session: {
  id: string;
  elderId: string;
  ifDemo: boolean;
  date: Date;
  duration: number;
  status: RecordingState;
  report: string | null;
  _count: { warnings: number; actionItems: number; bodyFindings: number };
}): SessionSummary => ({
  id: session.id,
  elderId: session.elderId,
  ifDemo: session.ifDemo,
  date: toDate(session.date),
  duration: session.duration,
  status: session.status as SessionSummary['status'],
  warningCount: session._count.warnings,
  actionItemCount: session._count.actionItems,
  bodyFindingCount: session._count.bodyFindings,
  hasReport: Boolean(session.report?.trim()),
});
