import demoData from '@/data/demo/interviews.json';
import type { CalendarDay, CommunityBodyStat, DemoDataset, ElderProfile, ExtractResult, VisitSession } from '../types';

const data = structuredClone(demoData) as DemoDataset;
export const elders: ElderProfile[] = data.elders;
export const mockSessions: Record<string, VisitSession[]> = data.sessionsByElder;

export const MockService = {
  getElders: async () => {
    return new Promise<ElderProfile[]>((resolve) => setTimeout(() => resolve(elders), 300));
  },
  getSession: async (elderId: string, sessionId?: string) => {
    return new Promise<VisitSession | null>((resolve) => {
      setTimeout(() => {
        const sessions = mockSessions[elderId];
        if (!sessions?.length) {
          resolve(null);
          return;
        }
        resolve(sessionId ? sessions.find((item) => item.id === sessionId) ?? sessions[0] : sessions[0]);
      }, 400);
    });
  },
  getSessionsByElder: async (elderId: string) => {
    return new Promise<VisitSession[]>((resolve) => {
      setTimeout(() => resolve((mockSessions[elderId] ?? []).slice().sort((a, b) => b.date.localeCompare(a.date))), 250);
    });
  },
  getCalendarDays: async () => {
    return new Promise<CalendarDay[]>((resolve) => {
      const map = new Map<string, Set<string>>();
      Object.entries(mockSessions).forEach(([elderId, sessions]) => {
        sessions.forEach((session) => {
          const set = map.get(session.date) ?? new Set<string>();
          set.add(elderId);
          map.set(session.date, set);
        });
      });
      const days = Array.from(map.entries()).map(([date, elderSet]) => ({
        date,
        elderIds: Array.from(elderSet),
      }));
      resolve(days);
    });
  },
  getCommunityBodyStats: async () => {
    return new Promise<CommunityBodyStat[]>((resolve) => {
      const elderIds = new Set<string>();
      const issueMap = new Map<CommunityBodyStat['part'], { issueCount: number; elders: Set<string> }>();
      Object.values(mockSessions).flat().forEach((session) => {
        elderIds.add(session.elderId);
        session.bodyMapSnapshot?.findings.forEach((finding) => {
          if (finding.status === 'resolved') return;
          const prev = issueMap.get(finding.part) ?? { issueCount: 0, elders: new Set<string>() };
          prev.issueCount += 1;
          prev.elders.add(session.elderId);
          issueMap.set(finding.part, prev);
        });
      });
      const total = Math.max(1, elderIds.size);
      resolve(
        Array.from(issueMap.entries()).map(([part, info]) => ({
          part,
          issueCount: info.issueCount,
          elderCount: info.elders.size,
          rate: Number((info.elders.size / total).toFixed(2)),
        }))
      );
    });
  },
  createElder: async (payload: Omit<ElderProfile, 'id'>) => {
    const created: ElderProfile = {
      ...payload,
      id: `elder-${Date.now()}`,
      lastVisitDate: new Date().toISOString().slice(0, 10),
      overallRisk: 'low',
    };
    elders.unshift(created);
    mockSessions[created.id] = [];
    return created;
  },
  updateActionItem: async (sessionId: string, itemId: string, checked: boolean) => {
    const allSessions = Object.values(mockSessions).flat();
    const session = allSessions.find((item) => item.id === sessionId);
    const extract = session?.extractResult;
    if (!extract) return null;
    extract.action_items = extract.action_items.map((item) =>
      item.id === itemId ? { ...item, status: checked ? 'completed' : 'pending' } : item
    );
    return extract.action_items.find((item) => item.id === itemId) ?? null;
  },
  appendTranscriptSegment: async (sessionId: string, segmentText: string) => {
    const allSessions = Object.values(mockSessions).flat();
    const session = allSessions.find((item) => item.id === sessionId);
    if (!session) return null;
    const last = session.transcript[session.transcript.length - 1];
    const maxStart = last?.endTime ?? 0;
    const segmentId = `${sessionId}-sg-${session.transcript.length + 1}`;
    session.transcript.push({
      id: segmentId,
      startTime: maxStart,
      endTime: maxStart + 6,
      speaker: 'elder',
      text: segmentText,
    });
    return session.transcript[session.transcript.length - 1] ?? null;
  },
  transcribeAudio: async () => {
    return new Promise<{ text: string }>((resolve) => {
      setTimeout(() => {
        resolve({ text: mockSessions['1'][0].transcript.map((s) => s.text).join('\n') });
      }, 1000);
    });
  },
  extractInsights: async (session: VisitSession) => {
    return new Promise<ExtractResult>((resolve, reject) => {
      setTimeout(() => {
        if (!session.extractResult) {
          reject(new Error('当前会话缺少结构化抽取结果'));
          return;
        }
        resolve(session.extractResult);
      }, 900);
    });
  },
  generateReport: async (extract: ExtractResult) => {
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve(
          `自动生成报告（Mock）\n\n用药：${extract.medication.summary}\n症状：${extract.symptoms
            .map((item) => item.description)
            .join('；')}\n情绪：${extract.emotion.summary}\n建议：${extract.action_items.map((i) => i.content).join('；')}`
        );
      }, 700);
    });
  },
};
