export type RiskLevel = 'high' | 'medium' | 'low';
export type AppMode = 'demo' | 'live';
export type BodyPart =
  | 'head'
  | 'chest'
  | 'abdomen'
  | 'left_arm'
  | 'right_arm'
  | 'left_leg'
  | 'right_leg'
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
  /** 结构化块（用于右侧生成式块渲染） */
  insightBlocks?: InsightBlock[];
}

export interface VisitSession {
  id: string;
  elderId: string;
  date: string;
  duration: number; // in seconds
  status: RecordingState;
  transcript: TranscriptSegment[];
  sourceRefs?: SourceRef[];
  extractResult?: ExtractResult;
  bodyMapSnapshot?: BodyMapSnapshot;
  report?: string;
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
  useMock: boolean;
  apiBaseUrl: string;
  autoGenerateReport: boolean;
  mode: AppMode;
}
