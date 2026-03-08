import { MockService } from './mock';
import { ElderProfile, VisitSession } from '../types';

// Adapter pattern: switch between MockService and real API here.
const USE_MOCK = true;

export const ApiService = {
  getElders: async (): Promise<ElderProfile[]> => {
    if (USE_MOCK) return MockService.getElders();
    const res = await fetch('/api/elders');
    return res.json();
  },
  
  getSession: async (elderId: string): Promise<VisitSession | null> => {
    if (USE_MOCK) return MockService.getSession(elderId);
    const res = await fetch(`/api/sessions?elderId=${elderId}`);
    return res.json();
  },
  
  uploadAudio: async (_file: File): Promise<{ transcriptId: string }> => {
    // Return mock immediately
    return new Promise(resolve => setTimeout(() => resolve({ transcriptId: 't1' }), 1500));
  }
};
