import { MockService } from './mock';
import { CalendarDay, CommunityBodyStat, ElderProfile, ExtractResult, VisitSession } from '../types';
import { IncrementalExtractResult } from './llmAdapter';

export class ApiNotImplementedError extends Error {
  constructor(endpoint: string) {
    super(`API 未接入：${endpoint}`);
    this.name = 'ApiNotImplementedError';
  }
}

interface ApiContext {
  useMock: boolean;
  baseUrl?: string;
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
    if (ctx.useMock) return MockService.getElders();
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/elders');
    const response = await fetch(`${baseUrl}/api/elders`);
    if (!response.ok) throw new Error('加载长者列表失败');
    return response.json();
  },

  getSession: async (elderId: string, ctx: ApiContext): Promise<VisitSession | null> => {
    if (ctx.useMock) return MockService.getSession(elderId);
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/elders/:elderId/sessions');
    const sessions = await fetchJson<VisitSession[]>(`${baseUrl}/api/elders/${encodeURIComponent(elderId)}/sessions`);
    return sessions[0] ?? null;
  },
  getSessionsByElder: async (elderId: string, ctx: ApiContext): Promise<VisitSession[]> => {
    if (ctx.useMock) return MockService.getSessionsByElder(elderId);
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/elders/:elderId/sessions');
    return fetchJson<VisitSession[]>(`${baseUrl}/api/elders/${encodeURIComponent(elderId)}/sessions`);
  },
  getCalendarDays: async (ctx: ApiContext): Promise<CalendarDay[]> => {
    if (ctx.useMock) return MockService.getCalendarDays();
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/calendar');
    return fetchJson<CalendarDay[]>(`${baseUrl}/api/calendar`);
  },
  getCommunityBodyStats: async (ctx: ApiContext): Promise<CommunityBodyStat[]> => {
    if (ctx.useMock) return MockService.getCommunityBodyStats();
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/community/body-heatmap');
    return fetchJson<CommunityBodyStat[]>(`${baseUrl}/api/community/body-heatmap`);
  },
  appendTranscriptSegment: async (sessionId: string, segmentText: string, ctx: ApiContext) => {
    if (ctx.useMock) return MockService.appendTranscriptSegment(sessionId, segmentText);
    const baseUrl = resolveBaseUrl(ctx);
    if (!baseUrl) return notImplemented('/api/sessions/:sessionId/transcript/append');
    return fetchJson<VisitSession['transcript'][number]>(`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/transcript/append`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segmentText }),
    });
  },

  incrementalExtract: async (
    sessionId: string,
    segmentId: string,
    segmentText: string,
    ctx: ApiContext
  ): Promise<IncrementalExtractResult> => {
    if (ctx.useMock) return notImplemented('/mock/incremental-extract');
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
    if (ctx.useMock) return MockService.transcribeAudio();
    return notImplemented('/api/transcribe');
  },

  extractInsights: async (session: VisitSession, ctx: ApiContext): Promise<ExtractResult> => {
    if (ctx.useMock) return MockService.extractInsights(session);
    return notImplemented('/api/extract');
  },

  generateReport: async (extract: ExtractResult, ctx: ApiContext): Promise<string> => {
    if (ctx.useMock) return MockService.generateReport(extract);
    return notImplemented('/api/report');
  },

  createElder: async (payload: Omit<ElderProfile, 'id'>, ctx: ApiContext): Promise<ElderProfile> => {
    if (ctx.useMock) return MockService.createElder(payload);
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
    if (ctx.useMock) return MockService.updateActionItem(sessionId, itemId, checked);
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
};
