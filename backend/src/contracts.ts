export type RiskLevel = 'high' | 'medium' | 'low';
export type RecordingState = 'idle' | 'recording' | 'transcribing' | 'extracting' | 'completed' | 'error';
export type Speaker = 'social_worker' | 'elder';
export type BodyFindingStatus = 'new' | 'ongoing' | 'resolved';
export type BodyViewSide = 'front' | 'back';

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
  speaker: Speaker;
  text: string;
  risk?: RiskLevel;
  keywords?: string[];
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
  part: string;
  label: string;
  status: BodyFindingStatus;
  risk: RiskLevel;
  sourceRefIds: string[];
  viewSide?: BodyViewSide;
}

export interface ExtractDimension {
  summary: string;
  risk: RiskLevel;
  details?: string[];
  sourceSegmentIds?: string[];
}

export interface ExtractResult {
  medication: ExtractDimension;
  symptoms: Array<{ id?: string; description: string; risk: RiskLevel; sourceSegmentIds?: string[] }>;
  diet: ExtractDimension;
  emotion: ExtractDimension;
  adl: ExtractDimension;
  social_support: ExtractDimension;
  action_items: Array<{
    id: string;
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: RiskLevel;
    sourceSegmentIds?: string[];
  }>;
  warnings: string[];
  warningSegmentIds?: string[][];
  insightBlocks?: InsightBlock[];
}

export interface VisitSession {
  id: string;
  elderId: string;
  date: string;
  duration: number;
  status: RecordingState;
  transcript: TranscriptSegment[];
  sourceRefs?: SourceRef[];
  extractResult?: ExtractResult;
  bodyMapSnapshot?: {
    sessionId: string;
    date: string;
    findings: BodyFinding[];
  };
  report?: string;
}

export interface CalendarDay {
  date: string;
  elderIds: string[];
}

export interface CommunityBodyStat {
  part: string;
  issueCount: number;
  elderCount: number;
  rate: number;
  activeCount: number;
  resolvedCount: number;
}

export interface DemoDataset {
  elders: ElderProfile[];
  sessionsByElder: Record<string, VisitSession[]>;
}
