export type RiskLevel = 'high' | 'medium' | 'low';
export type BodyPart =
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
  | 'back';
export type BodyFindingStatus = 'new' | 'ongoing' | 'resolved';
export type RecordingState =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'extracting'
  | 'completed'
  | 'error';
export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ElderProfile {
  id: string;
  ifDemo?: boolean;
  name: string;
  age: number;
  gender: 'M' | 'F';
  address: string;
  contactNumber: string;
  livingStatus: '独居' | '与配偶同住' | '与子女同住' | '院舍';
  chronicDiseases: string[];
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  tags?: string[];
  lastVisitDate?: string;
  overallRisk?: RiskLevel;
}

export interface TranscriptSegment {
  id: string;
  startTime: number;
  endTime: number;
  speaker: 'social_worker' | 'elder';
  text: string;
  keywords?: string[]; // keywords that map to insights
  risk?: RiskLevel;
}

export interface ExtractDimension {
  summary: string;
  risk: RiskLevel;
  details?: string[];
  /** 对应转写段落 id，用于左右联动定位 */
  sourceSegmentIds?: string[];
}

export interface DimensionSummaryItem {
  id: string;
  dimension: string;
  summary: string;
  risk: RiskLevel;
  details?: string[];
  sourceSegmentIds?: string[];
}

export interface SourceRef {
  id: string;
  segmentId: string;
  startChar: number;
  endChar: number;
  text: string;
}

export interface InsightBlock {
  id: string;
  title: string;
  type: 'warning' | 'medication' | 'symptom' | 'emotion' | 'social' | 'diet' | 'adl' | 'action_item';
  risk: RiskLevel;
  summary: string;
  sourceRefIds: string[];
}

export interface BodyFinding {
  id: string;
  part: BodyPart;
  viewSide?: 'front' | 'back';
  label: string;
  status: BodyFindingStatus;
  risk: RiskLevel;
  sourceRefIds: string[];
}

export interface BodyMapSnapshot {
  sessionId: string;
  date: string;
  findings: BodyFinding[];
}

export interface ExtractResult {
  medication: ExtractDimension;
  symptoms: Array<{ description: string; risk: RiskLevel; sourceSegmentIds?: string[] }>;
  diet: ExtractDimension;
  emotion: ExtractDimension;
  adl: ExtractDimension;
  social_support: ExtractDimension;
  action_items: Array<{
    id: string;
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: RiskLevel;
    /** 对应转写段落 id，用于从待办跳转到转写 */
    sourceSegmentIds?: string[];
  }>;
  warnings: string[];
  /** 每个预警对应的转写段落 id 列表，与 warnings 同序 */
  warningSegmentIds?: string[][];
  /** 预警对象（增强版，便于档案页完整展示） */
  warningItems?: Array<{
    id: string;
    content: string;
    severity: RiskLevel;
    sourceRefIds?: string[];
    sourceSegmentIds?: string[];
  }>;
  /** 结构化块（用于右侧生成式块渲染） */
  insightBlocks?: InsightBlock[];
  /** 动态维度汇总（支持新增/删除） */
  dimensionSummaries?: DimensionSummaryItem[];
}

export interface VisitSession {
  id: string;
  elderId: string;
  ifDemo?: boolean;
  date: string;
  duration: number; // in seconds
  status: RecordingState;
  transcript: TranscriptSegment[];
  sourceRefs?: SourceRef[];
  extractResult?: ExtractResult;
  bodyMapSnapshot?: BodyMapSnapshot;
  report?: string;
}

export interface SessionSummary {
  id: string;
  elderId: string;
  date: string;
  duration: number;
  status: RecordingState;
  ifDemo?: boolean;
  warningCount: number;
  actionItemCount: number;
  bodyFindingCount: number;
  hasReport: boolean;
}

export interface DailySessionEntry {
  sessionId: string;
  elderId: string;
  elderName: string;
  date: string;
  duration: number;
  warningCount: number;
  bodyFindingCount: number;
  actionItemCount: number;
}

export interface CalendarDay {
  date: string;
  elderIds: string[];
}

export interface CommunityBodyStat {
  part: BodyPart;
  issueCount: number;
  elderCount: number;
  rate: number;
  activeCount?: number;
  resolvedCount?: number;
  topLabels?: { name: string; count: number }[];
}

export interface CommunityKpiSummary {
  elderTotal: number;
  highRiskElders: number;
  mediumRiskElders: number;
  lowRiskElders: number;
  activeIssueElders: number;
  resolvedIssueElders: number;
  newIssueCount: number;
  warningCount: number;
  pendingActionCount: number;
  completedActionCount: number;
}

export interface CommunityTrendPoint {
  bucket: string;
  highRiskElders: number;
  mediumRiskElders: number;
  lowRiskElders: number;
  activeIssueElders: number;
  warningCount: number;
  resolvedCount: number;
}

export interface CommunityRegionStat {
  region: string;
  elderCount: number;
  highRiskCount: number;
  activeIssueCount: number;
  warningCount: number;
}

export interface CommunityChronicStat {
  disease: string;
  elderCount: number;
  highRiskCount: number;
  activeIssueCount: number;
}

export interface CommunityPivotRow {
  bucket: string;
  region: string;
  risk: RiskLevel;
  chronicDisease: string;
  bodyPart: BodyPart | 'none';
  findingStatus: BodyFindingStatus | 'none';
  dataScope: 'demo' | 'real';
  elderCount: number;
  sessionCount: number;
  issueCount: number;
  warningCount: number;
  actionPendingCount: number;
  actionCompletedCount: number;
}

export interface CommunityElderRow {
  elderId: string;
  elderName: string;
  region: string;
  risk: RiskLevel;
  chronicDiseases: string[];
  lastSessionDate?: string;
  lastSessionId?: string;
  activeIssueCount: number;
  resolvedIssueCount: number;
  warningCount: number;
  pendingActionCount: number;
  completedActionCount: number;
  oldestUnresolvedDays: number;
  involvedParts: Array<BodyPart | 'none'>;
  dataScope: 'demo' | 'real' | 'mixed';
}

export interface CommunityDashboard {
  window: '7d' | '30d' | '90d' | 'all';
  granularity: 'day' | 'week' | 'month';
  includeDemo: boolean;
  generatedAt: string;
  kpis: CommunityKpiSummary;
  riskDistribution: Array<{ risk: RiskLevel; count: number }>;
  trends: CommunityTrendPoint[];
  regionStats: CommunityRegionStat[];
  chronicStats: CommunityChronicStat[];
  bodyPartStats: CommunityBodyStat[];
  pivotRows: CommunityPivotRow[];
  elderRows: CommunityElderRow[];
}

export interface DemoDataset {
  elders: ElderProfile[];
  sessionsByElder: Record<string, VisitSession[]>;
}

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

export interface AppSettings {
  compactMode: boolean;
  fontScale: number;
  highContrast: boolean;
  reducedMotion: boolean;
  noiseReduction: boolean;
  sampleRate: '16k' | '44.1k';
  reportLanguage: 'zh-HK' | 'zh-HK+en';
  reportTemplate: 'standard' | 'detailed';
  apiBaseUrl: string;
  showDemoData: boolean;
  autoGenerateReport: boolean;
}

export type StructuredItemType = 'warning' | 'insight' | 'action_item' | 'body_finding' | 'dimension';

export interface FieldOperationMeta {
  operationId: string;
  fieldPath: string;
  previousValue: unknown;
}
