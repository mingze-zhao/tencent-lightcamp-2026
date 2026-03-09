import {
  BodyFinding,
  CalendarDay,
  CommunityDashboard,
  CommunityBodyStat,
  DailySessionEntry,
  DimensionSummaryItem,
  ElderProfile,
  ExtractResult,
  InsightBlock,
  RiskLevel,
  SessionSummary,
  SourceRef,
  VisitSession,
} from '../types';
import { IncrementalExtractResult } from './llmAdapter';

export class ApiNotImplementedError extends Error {
  constructor(endpoint: string) {
    super(`API 未接入：${endpoint}`);
    this.name = 'ApiNotImplementedError';
  }
}

interface ApiContext {
  baseUrl?: string;
  showDemoData?: boolean;
}

const resolveBaseUrl = (ctx: ApiContext) => (ctx.baseUrl || '').replace(/\/$/, '');

const notImplemented = (endpoint: string): never => {
  throw new ApiNotImplementedError(endpoint);
};

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
};

export const ApiService = {
  getElders: async (ctx: ApiContext): Promise<ElderProfile[]> => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/elders');
    return fetchJson<ElderProfile[]>(
      `${baseUrl}/api/elders?includeDemo=${ctx.showDemoData === false ? '0' : '1'}`
    );
  },

  getSession: async (elderId: string, ctx: ApiContext): Promise<VisitSession | null> => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/elders/:elderId/sessions');
    const sessions = await fetchJson<VisitSession[]>(
      `${baseUrl}/api/elders/${encodeURIComponent(elderId)}/sessions?includeDemo=${ctx.showDemoData === false ? '0' : '1'}`
    );
    return sessions[0] ?? null;
  },
  getSessionsByElder: async (elderId: string, ctx: ApiContext): Promise<VisitSession[]> => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/elders/:elderId/sessions');
    return fetchJson<VisitSession[]>(
      `${baseUrl}/api/elders/${encodeURIComponent(elderId)}/sessions?includeDemo=${ctx.showDemoData === false ? '0' : '1'}`
    );
  },
  getSessionSummariesByElder: async (elderId: string, ctx: ApiContext): Promise<SessionSummary[]> => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/elders/:elderId/sessions?view=summary');
    return fetchJson<SessionSummary[]>(
      `${baseUrl}/api/elders/${encodeURIComponent(elderId)}/sessions?view=summary&includeDemo=${ctx.showDemoData === false ? '0' : '1'}`
    );
  },
  getSessionsByDate: async (date: string, ctx: ApiContext): Promise<DailySessionEntry[]> => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/by-date');
    return fetchJson<DailySessionEntry[]>(
      `${baseUrl}/api/sessions/by-date?date=${encodeURIComponent(date)}&includeDemo=${ctx.showDemoData === false ? '0' : '1'}`
    );
  },
  getSessionFull: async (
    sessionId: string,
    include: Array<'transcript' | 'sourceRefs' | 'extract' | 'bodyMap'>,
    ctx: ApiContext
  ): Promise<VisitSession> => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/full');
    return fetchJson<VisitSession>(
      `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/full?include=${encodeURIComponent(include.join(','))}&includeDemo=${ctx.showDemoData === false ? '0' : '1'}`
    );
  },
  getCalendarDays: async (ctx: ApiContext): Promise<CalendarDay[]> => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/calendar');
    return fetchJson<CalendarDay[]>(
      `${baseUrl}/api/calendar?includeDemo=${ctx.showDemoData === false ? '0' : '1'}`
    );
  },
  getCommunityBodyStats: async (ctx: ApiContext): Promise<CommunityBodyStat[]> => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/community/body-heatmap');
    return fetchJson<CommunityBodyStat[]>(
      `${baseUrl}/api/community/body-heatmap?includeDemo=${ctx.showDemoData === false ? '0' : '1'}`
    );
  },
  getCommunityDashboard: async (
    params: {
      window?: '7d' | '30d' | '90d' | 'all';
      granularity?: 'day' | 'week' | 'month';
    },
    ctx: ApiContext
  ): Promise<CommunityDashboard> => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/community/dashboard');
    const query = new URLSearchParams({
      includeDemo: ctx.showDemoData === false ? '0' : '1',
      window: params.window ?? '30d',
      granularity: params.granularity ?? 'day',
    });
    return fetchJson<CommunityDashboard>(`${baseUrl}/api/community/dashboard?${query.toString()}`);
  },
  appendTranscriptSegment: async (sessionId: string, segmentText: string, ctx: ApiContext) => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/transcript/append');
    return fetchJson<VisitSession['transcript'][number]>(`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/transcript/append`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segmentText }),
    });
  },
  createSourceRef: async (
    sessionId: string,
    payload: { segmentId: string; startChar: number; endChar: number; text?: string },
    ctx: ApiContext
  ) => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/source-refs');
    return fetchJson<SourceRef>(
      `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/source-refs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
  },

  incrementalExtract: async (
    sessionId: string,
    segmentId: string,
    segmentText: string,
    ctx: ApiContext
  ): Promise<IncrementalExtractResult> => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/incremental-extract');
    return fetchJson<IncrementalExtractResult>(
      `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/incremental-extract`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId, segmentText }),
      }
    );
  },

  transcribeAudio: async (_file: File, ctx: ApiContext): Promise<{ text: string }> => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/transcribe');
    return fetchJson<{ text: string }>(`${baseUrl}/api/transcribe`, { method: 'POST' });
  },

  extractInsights: async (session: VisitSession, ctx: ApiContext): Promise<ExtractResult> => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/extract');
    return fetchJson<ExtractResult>(`${baseUrl}/api/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id }),
    });
  },

  generateReport: async (extract: ExtractResult, ctx: ApiContext): Promise<string> => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/report');
    return fetchJson<string>(`${baseUrl}/api/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extract }),
    });
  },

  createElder: async (payload: Omit<ElderProfile, 'id'>, ctx: ApiContext): Promise<ElderProfile> => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/elders');
    return fetchJson<ElderProfile>(`${baseUrl}/api/elders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  updateActionItem: async (
    sessionId: string,
    itemId: string,
    checked: boolean,
    ctx: ApiContext
  ) => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/action-items/:itemId');
    return fetchJson<{ id: string; status: string }>(
      `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/action-items/${encodeURIComponent(itemId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked }),
      }
    );
  },

  updateActionItemDetail: async (
    sessionId: string,
    itemId: string,
    payload: { checked?: boolean; content?: string; priority?: 'high' | 'medium' | 'low' },
    ctx: ApiContext
  ) => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/action-items/:itemId');
    return fetchJson<{ id: string; status: string; content: string }>(
      `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/action-items/${encodeURIComponent(itemId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
  },

  updateElder: async (
    elderId: string,
    payload: Partial<Pick<ElderProfile, 'name' | 'age' | 'address' | 'contactNumber' | 'livingStatus' | 'chronicDiseases' | 'tags'>>,
    ctx: ApiContext
  ): Promise<ElderProfile> => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/elders/:elderId');
    return fetchJson<ElderProfile>(`${baseUrl}/api/elders/${encodeURIComponent(elderId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  updateSession: async (sessionId: string, payload: Partial<Pick<VisitSession, 'date' | 'duration' | 'report'>>, ctx: ApiContext) => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId');
    return fetchJson<VisitSession>(`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  updateTranscriptSegment: async (
    sessionId: string,
    segmentId: string,
    payload: Partial<Pick<VisitSession['transcript'][number], 'text' | 'risk'>>,
    ctx: ApiContext
  ) => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/transcript/:segmentId');
    return fetchJson<VisitSession['transcript'][number]>(
      `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/transcript/${encodeURIComponent(segmentId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
  },

  updateInsightBlock: async (
    sessionId: string,
    blockId: string,
    payload: Partial<{ title: string; summary: string; risk: 'high' | 'medium' | 'low' }>,
    ctx: ApiContext
  ) => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/insights/:blockId');
    return fetchJson<{ id: string }>(
      `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/insights/${encodeURIComponent(blockId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
  },

  updateBodyFinding: async (
    sessionId: string,
    findingId: string,
    payload: Partial<{ label: string; status: 'new' | 'ongoing' | 'resolved'; risk: 'high' | 'medium' | 'low'; viewSide: 'front' | 'back' }>,
    ctx: ApiContext
  ) => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/body-findings/:findingId');
    return fetchJson<{ id: string }>(
      `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/body-findings/${encodeURIComponent(findingId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
  },

  updateWarning: async (sessionId: string, warningIndex: number, content: string, ctx: ApiContext) => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/warnings/:warningIndex');
    return fetchJson<{ id: string; content: string }>(
      `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/warnings/${warningIndex}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      }
    );
  },

  createInsightBlock: async (
    sessionId: string,
    payload: Partial<Pick<InsightBlock, 'title' | 'summary' | 'risk' | 'type'>> & { sourceRefIds?: string[] },
    ctx: ApiContext
  ): Promise<InsightBlock> => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/insights');
    return fetchJson<InsightBlock>(`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  deleteInsightBlock: async (sessionId: string, blockId: string, ctx: ApiContext) => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/insights/:blockId');
    return fetchJson<{ ok: boolean }>(
      `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/insights/${encodeURIComponent(blockId)}`,
      { method: 'DELETE' }
    );
  },

  createWarning: async (
    sessionId: string,
    payload: { content: string; severity?: RiskLevel; sourceRefIds?: string[] },
    ctx: ApiContext
  ) => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/warnings');
    return fetchJson<{ id: string; content: string; sourceRefIds: string[] }>(
      `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/warnings`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
  },

  deleteWarningByIndex: async (sessionId: string, warningIndex: number, ctx: ApiContext) => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/warnings/:warningIndex');
    return fetchJson<{ ok: boolean }>(
      `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/warnings/${warningIndex}`,
      {
        method: 'DELETE',
      }
    );
  },

  createActionItem: async (
    sessionId: string,
    payload: {
      content: string;
      priority?: RiskLevel;
      status?: 'pending' | 'in_progress' | 'completed';
      sourceRefIds?: string[];
    },
    ctx: ApiContext
  ) => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/action-items');
    return fetchJson<ExtractResult['action_items'][number]>(
      `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/action-items`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
  },

  deleteActionItem: async (sessionId: string, itemId: string, ctx: ApiContext) => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/action-items/:itemId');
    return fetchJson<{ ok: boolean }>(
      `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/action-items/${encodeURIComponent(itemId)}`,
      {
        method: 'DELETE',
      }
    );
  },

  createBodyFinding: async (
    sessionId: string,
    payload: Partial<BodyFinding>,
    ctx: ApiContext
  ): Promise<BodyFinding> => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/body-findings');
    return fetchJson<BodyFinding>(`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/body-findings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  deleteBodyFinding: async (sessionId: string, findingId: string, ctx: ApiContext) => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/body-findings/:findingId');
    return fetchJson<{ ok: boolean }>(
      `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/body-findings/${encodeURIComponent(findingId)}`,
      {
        method: 'DELETE',
      }
    );
  },

  createDimensionSummary: async (
    sessionId: string,
    payload: Omit<DimensionSummaryItem, 'id'>,
    ctx: ApiContext
  ): Promise<DimensionSummaryItem> => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/dimensions');
    return fetchJson<DimensionSummaryItem>(`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/dimensions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  deleteDimensionSummary: async (sessionId: string, dimensionId: string, ctx: ApiContext) => {
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/dimensions/:dimensionId');
    return fetchJson<{ ok: boolean }>(
      `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/dimensions/${encodeURIComponent(dimensionId)}`,
      {
        method: 'DELETE',
      }
    );
  },
};
