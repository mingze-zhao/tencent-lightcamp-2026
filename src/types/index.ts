export type RiskLevel = 'high' | 'medium' | 'low';

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
}

export interface ExtractResult {
  medication: ExtractDimension;
  symptoms: Array<{ description: string; risk: RiskLevel }>;
  diet: ExtractDimension;
  emotion: ExtractDimension;
  adl: ExtractDimension;
  social_support: ExtractDimension;
  action_items: Array<{
    id: string;
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: RiskLevel;
  }>;
  warnings: string[];
}

export interface VisitSession {
  id: string;
  elderId: string;
  date: string;
  duration: number; // in seconds
  status: 'recording' | 'transcribing' | 'extracting' | 'completed' | 'error';
  transcript: TranscriptSegment[];
  extractResult?: ExtractResult;
  report?: string;
}
