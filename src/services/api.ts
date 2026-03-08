import { MockService } from './mock';
import { ElderProfile, ExtractResult, VisitSession } from '../types';

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
    if (!baseUrl) return notImplemented('/api/sessions');
    const response = await fetch(`${baseUrl}/api/sessions?elderId=${encodeURIComponent(elderId)}`);
    if (!response.ok) throw new Error('加载会话失败');
    return response.json();
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
    return notImplemented('/api/elder/create');
  },

  updateActionItem: async (
    sessionId: string,
    itemId: string,
    checked: boolean,
    ctx: ApiContext
  ) => {
    if (ctx.useMock) return MockService.updateActionItem(sessionId, itemId, checked);
    return notImplemented('/api/action-item/update');
  },
};
