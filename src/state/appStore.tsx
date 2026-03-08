import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type PropsWithChildren,
} from 'react';
import { ApiNotImplementedError, ApiService } from '@/services/api';
import { LLMAdapter } from '@/services/llmAdapter';
import type {
  AppSettings,
  CalendarDay,
  CommunityBodyStat,
  ElderProfile,
  RecordingState,
  ToastMessage,
  VisitSession,
} from '@/types';

type AppStatus = 'idle' | 'loading' | 'ready' | 'error';
type PageKey = 'workbench' | 'community';

interface AppState {
  status: AppStatus;
  errorMessage?: string;
  elders: ElderProfile[];
  selectedElderId?: string;
  selectedSessionId?: string;
  selectedDate?: string;
  selectedSession?: VisitSession;
  sessionsByElder: Record<string, VisitSession[]>;
  calendarDays: CalendarDay[];
  communityBodyStats: CommunityBodyStat[];
  currentPage: PageKey;
  recordingState: RecordingState;
  recordingSeconds: number;
  transcriptSearchKeyword: string;
  activeSegmentId?: string;
  activeSourceRefId?: string;
  notifications: ToastMessage[];
  isSettingsOpen: boolean;
  isAddElderOpen: boolean;
  settings: AppSettings;
}

type AppAction =
  | { type: 'setStatus'; payload: AppStatus }
  | { type: 'setError'; payload?: string }
  | { type: 'setElders'; payload: ElderProfile[] }
  | { type: 'setSelectedElder'; payload?: string }
  | { type: 'setSelectedDate'; payload?: string }
  | { type: 'setSessionsByElder'; payload: { elderId: string; sessions: VisitSession[] } }
  | { type: 'setCalendarDays'; payload: CalendarDay[] }
  | { type: 'setSelectedSession'; payload?: VisitSession }
  | { type: 'setSelectedSessionId'; payload?: string }
  | { type: 'setCommunityStats'; payload: CommunityBodyStat[] }
  | { type: 'setCurrentPage'; payload: PageKey }
  | { type: 'setRecordingState'; payload: RecordingState }
  | { type: 'setRecordingSeconds'; payload: number }
  | { type: 'setSearchKeyword'; payload: string }
  | { type: 'setActiveSegment'; payload?: string }
  | { type: 'setActiveSourceRef'; payload?: string }
  | { type: 'addToast'; payload: ToastMessage }
  | { type: 'removeToast'; payload: string }
  | { type: 'setSettingsOpen'; payload: boolean }
  | { type: 'setAddElderOpen'; payload: boolean }
  | { type: 'mergeSettings'; payload: Partial<AppSettings> }
  | { type: 'updateActionItem'; payload: { itemId: string; checked: boolean } };

const SETTINGS_STORAGE_KEY = 'home-visit-settings';

const defaultSettings: AppSettings = {
  compactMode: false,
  fontScale: 100,
  highContrast: false,
  reducedMotion: false,
  noiseReduction: true,
  sampleRate: '16k',
  reportLanguage: 'zh-HK',
  reportTemplate: 'standard',
  useMock: true,
  apiBaseUrl: '',
  autoGenerateReport: false,
  mode: 'demo',
};

const initialState: AppState = {
  status: 'idle',
  elders: [],
  sessionsByElder: {},
  calendarDays: [],
  communityBodyStats: [],
  currentPage: 'workbench',
  recordingState: 'idle',
  recordingSeconds: 0,
  transcriptSearchKeyword: '',
  notifications: [],
  isSettingsOpen: false,
  isAddElderOpen: false,
  settings: defaultSettings,
};

const pickSessionByDate = (sessions: VisitSession[], date?: string) => {
  if (!sessions.length) return undefined;
  if (!date) return sessions[0];
  return sessions.find((session) => session.date === date) ?? sessions[0];
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'setStatus':
      return { ...state, status: action.payload };
    case 'setError':
      return { ...state, errorMessage: action.payload };
    case 'setElders':
      return { ...state, elders: action.payload };
    case 'setSelectedElder':
      return { ...state, selectedElderId: action.payload };
    case 'setSelectedDate':
      return { ...state, selectedDate: action.payload };
    case 'setSessionsByElder':
      return {
        ...state,
        sessionsByElder: {
          ...state.sessionsByElder,
          [action.payload.elderId]: action.payload.sessions,
        },
      };
    case 'setCalendarDays':
      return { ...state, calendarDays: action.payload };
    case 'setSelectedSession':
      return { ...state, selectedSession: action.payload };
    case 'setSelectedSessionId':
      return { ...state, selectedSessionId: action.payload };
    case 'setCommunityStats':
      return { ...state, communityBodyStats: action.payload };
    case 'setCurrentPage':
      return { ...state, currentPage: action.payload };
    case 'setRecordingState':
      return { ...state, recordingState: action.payload };
    case 'setRecordingSeconds':
      return { ...state, recordingSeconds: action.payload };
    case 'setSearchKeyword':
      return { ...state, transcriptSearchKeyword: action.payload };
    case 'setActiveSegment':
      return { ...state, activeSegmentId: action.payload };
    case 'setActiveSourceRef':
      return { ...state, activeSourceRefId: action.payload };
    case 'addToast':
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'removeToast':
      return { ...state, notifications: state.notifications.filter((item) => item.id !== action.payload) };
    case 'setSettingsOpen':
      return { ...state, isSettingsOpen: action.payload };
    case 'setAddElderOpen':
      return { ...state, isAddElderOpen: action.payload };
    case 'mergeSettings':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'updateActionItem': {
      if (!state.selectedSession?.extractResult) return state;
      return {
        ...state,
        selectedSession: {
          ...state.selectedSession,
          extractResult: {
            ...state.selectedSession.extractResult,
            action_items: state.selectedSession.extractResult.action_items.map((item) =>
              item.id === action.payload.itemId
                ? { ...item, status: action.payload.checked ? 'completed' : 'pending' }
                : item
            ),
          },
        },
      };
    }
    default:
      return state;
  }
}

interface AppStoreValue {
  state: AppState;
  initialize: () => Promise<void>;
  selectElder: (elderId: string) => Promise<void>;
  selectDate: (date: string) => void;
  selectSession: (sessionId: string) => void;
  setSearchKeyword: (keyword: string) => void;
  setActiveSegment: (segmentId?: string) => void;
  setActiveSourceRef: (sourceRefId?: string) => void;
  setCurrentPage: (page: PageKey) => void;
  toggleRecording: () => Promise<void>;
  appendTranscriptAndGenerate: (segmentText: string) => Promise<void>;
  runExtractAndReport: () => Promise<void>;
  toggleActionItem: (itemId: string, checked: boolean) => Promise<void>;
  addElder: (payload: Omit<ElderProfile, 'id'>) => Promise<void>;
  openSettings: () => void;
  closeSettings: () => void;
  saveSettings: (settings: Partial<AppSettings>) => void;
  openAddElder: () => void;
  closeAddElder: () => void;
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);
const makeToastId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    dispatch({ type: 'addToast', payload: { id: makeToastId(), ...toast } });
  }, []);

  const removeToast = useCallback((id: string) => {
    dispatch({ type: 'removeToast', payload: id });
  }, []);

  const handleApiError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiNotImplementedError) {
        pushToast({ type: 'warning', title: 'API 未接入', description: error.message });
        return;
      }
      const message = error instanceof Error ? error.message : '未知错误';
      dispatch({ type: 'setError', payload: message });
      pushToast({ type: 'error', title: '操作失败', description: message });
    },
    [pushToast]
  );

  const resolveCtx = useCallback(
    (override?: { useMock: boolean; apiBaseUrl: string }) => ({
      useMock: override?.useMock ?? state.settings.useMock,
      baseUrl: override?.apiBaseUrl ?? state.settings.apiBaseUrl,
    }),
    [state.settings.apiBaseUrl, state.settings.useMock]
  );

  const refreshCommunityStats = useCallback(async () => {
    const stats = await ApiService.getCommunityBodyStats(resolveCtx());
    dispatch({ type: 'setCommunityStats', payload: stats });
  }, [resolveCtx]);

  const selectElder = useCallback(
    async (elderId: string, override?: { useMock: boolean; apiBaseUrl: string }) => {
      dispatch({ type: 'setSelectedElder', payload: elderId });
      dispatch({ type: 'setStatus', payload: 'loading' });
      try {
        const sessions = await ApiService.getSessionsByElder(elderId, resolveCtx(override));
        dispatch({ type: 'setSessionsByElder', payload: { elderId, sessions } });
        const next = pickSessionByDate(sessions, state.selectedDate);
        dispatch({ type: 'setSelectedSession', payload: next });
        dispatch({ type: 'setSelectedSessionId', payload: next?.id });
        dispatch({ type: 'setSelectedDate', payload: next?.date });
        dispatch({ type: 'setStatus', payload: 'ready' });
      } catch (error) {
        dispatch({ type: 'setStatus', payload: 'error' });
        handleApiError(error);
      }
    },
    [handleApiError, resolveCtx, state.selectedDate]
  );

  const initialize = useCallback(async () => {
    dispatch({ type: 'setStatus', payload: 'loading' });
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        dispatch({ type: 'mergeSettings', payload: JSON.parse(stored) as Partial<AppSettings> });
      }
      const override = stored
        ? {
            useMock: (JSON.parse(stored) as Partial<AppSettings>).useMock ?? true,
            apiBaseUrl: (JSON.parse(stored) as Partial<AppSettings>).apiBaseUrl ?? '',
          }
        : undefined;
      const elders = await ApiService.getElders(resolveCtx(override));
      const calendar = await ApiService.getCalendarDays(resolveCtx(override));
      dispatch({ type: 'setElders', payload: elders });
      dispatch({ type: 'setCalendarDays', payload: calendar });
      if (elders.length > 0) {
        await selectElder(elders[0].id, override);
      } else {
        dispatch({ type: 'setStatus', payload: 'ready' });
      }
      await refreshCommunityStats();
    } catch (error) {
      dispatch({ type: 'setStatus', payload: 'error' });
      handleApiError(error);
    }
  }, [handleApiError, refreshCommunityStats, resolveCtx, selectElder]);

  const selectDate = useCallback(
    (date: string) => {
      if (!state.selectedElderId) return;
      const sessions = state.sessionsByElder[state.selectedElderId] ?? [];
      const picked = pickSessionByDate(sessions, date);
      dispatch({ type: 'setSelectedDate', payload: date });
      dispatch({ type: 'setSelectedSessionId', payload: picked?.id });
      dispatch({ type: 'setSelectedSession', payload: picked });
    },
    [state.selectedElderId, state.sessionsByElder]
  );

  const selectSession = useCallback(
    (sessionId: string) => {
      if (!state.selectedElderId) return;
      const session = (state.sessionsByElder[state.selectedElderId] ?? []).find((item) => item.id === sessionId);
      if (!session) return;
      dispatch({ type: 'setSelectedSessionId', payload: session.id });
      dispatch({ type: 'setSelectedDate', payload: session.date });
      dispatch({ type: 'setSelectedSession', payload: session });
    },
    [state.selectedElderId, state.sessionsByElder]
  );

  const setSearchKeyword = useCallback((keyword: string) => {
    dispatch({ type: 'setSearchKeyword', payload: keyword });
  }, []);

  const setActiveSegment = useCallback((segmentId?: string) => {
    dispatch({ type: 'setActiveSegment', payload: segmentId });
  }, []);

  const setActiveSourceRef = useCallback((sourceRefId?: string) => {
    dispatch({ type: 'setActiveSourceRef', payload: sourceRefId });
  }, []);

  const setCurrentPage = useCallback((page: PageKey) => {
    dispatch({ type: 'setCurrentPage', payload: page });
  }, []);

  const patchSelectedSession = useCallback(
    (next: VisitSession) => {
      if (!state.selectedElderId) return;
      const sessions = (state.sessionsByElder[state.selectedElderId] ?? []).map((item) => (item.id === next.id ? next : item));
      dispatch({ type: 'setSessionsByElder', payload: { elderId: state.selectedElderId, sessions } });
      dispatch({ type: 'setSelectedSession', payload: next });
    },
    [state.selectedElderId, state.sessionsByElder]
  );

  const toggleRecording = useCallback(async () => {
    if (state.recordingState === 'recording') {
      dispatch({ type: 'setRecordingState', payload: 'completed' });
      pushToast({ type: 'success', title: '录音已停止', description: '可继续追加一句并触发增量抽取。' });
      return;
    }
    dispatch({ type: 'setRecordingSeconds', payload: 0 });
    dispatch({ type: 'setRecordingState', payload: 'recording' });
    pushToast({ type: 'info', title: '开始录音', description: '再次点击可停止。' });
  }, [pushToast, state.recordingState]);

  const appendTranscriptAndGenerate = useCallback(
    async (segmentText: string) => {
      if (!state.selectedSession) return;
      try {
        const appended = await ApiService.appendTranscriptSegment(state.selectedSession.id, segmentText, resolveCtx());
        if (!appended) return;
        const incremental = await LLMAdapter.generateIncremental(
          state.selectedSession,
          appended.id,
          appended.text,
          state.settings.mode
        );
        const next: VisitSession = {
          ...state.selectedSession,
          transcript: [...state.selectedSession.transcript, appended],
          sourceRefs: [...(state.selectedSession.sourceRefs ?? []), incremental.sourceRef],
          bodyMapSnapshot: state.selectedSession.bodyMapSnapshot
            ? {
                ...state.selectedSession.bodyMapSnapshot,
                findings: [...state.selectedSession.bodyMapSnapshot.findings, ...(incremental.bodyFinding ? [incremental.bodyFinding] : [])],
              }
            : undefined,
          extractResult: state.selectedSession.extractResult
            ? {
                ...state.selectedSession.extractResult,
                warnings: incremental.warning
                  ? [...state.selectedSession.extractResult.warnings, incremental.warning]
                  : state.selectedSession.extractResult.warnings,
                insightBlocks: [...(state.selectedSession.extractResult.insightBlocks ?? []), incremental.insightBlock],
              }
            : undefined,
        };
        patchSelectedSession(next);
        dispatch({ type: 'setActiveSegment', payload: appended.id });
        dispatch({ type: 'setActiveSourceRef', payload: incremental.sourceRef.id });
      } catch (error) {
        handleApiError(error);
      }
    },
    [handleApiError, patchSelectedSession, resolveCtx, state.selectedSession, state.settings.mode]
  );

  const runExtractAndReport = useCallback(async () => {
    if (!state.selectedSession) {
      pushToast({ type: 'warning', title: '无可处理会话', description: '请先选择会话。' });
      return;
    }
    dispatch({ type: 'setRecordingState', payload: 'extracting' });
    try {
      const extract = await ApiService.extractInsights(state.selectedSession, resolveCtx());
      const report = await ApiService.generateReport(extract, resolveCtx());
      patchSelectedSession({ ...state.selectedSession, extractResult: extract, report });
      dispatch({ type: 'setRecordingState', payload: 'completed' });
      await refreshCommunityStats();
      pushToast({ type: 'success', title: '报告已生成', description: '结构化信息已更新。' });
    } catch (error) {
      dispatch({ type: 'setRecordingState', payload: 'error' });
      handleApiError(error);
    }
  }, [handleApiError, patchSelectedSession, pushToast, refreshCommunityStats, resolveCtx, state.selectedSession]);

  const toggleActionItem = useCallback(
    async (itemId: string, checked: boolean) => {
      if (!state.selectedSession) return;
      dispatch({ type: 'updateActionItem', payload: { itemId, checked } });
      try {
        await ApiService.updateActionItem(state.selectedSession.id, itemId, checked, resolveCtx());
      } catch (error) {
        handleApiError(error);
      }
    },
    [handleApiError, resolveCtx, state.selectedSession]
  );

  const addElder = useCallback(
    async (payload: Omit<ElderProfile, 'id'>) => {
      try {
        const created = await ApiService.createElder(payload, resolveCtx());
        dispatch({ type: 'setElders', payload: [created, ...state.elders] });
        dispatch({ type: 'setAddElderOpen', payload: false });
        pushToast({ type: 'success', title: '已新增长者档案', description: `${created.name} 已加入列表。` });
      } catch (error) {
        handleApiError(error);
      }
    },
    [handleApiError, pushToast, resolveCtx, state.elders]
  );

  const openSettings = useCallback(() => dispatch({ type: 'setSettingsOpen', payload: true }), []);
  const closeSettings = useCallback(() => dispatch({ type: 'setSettingsOpen', payload: false }), []);
  const openAddElder = useCallback(() => dispatch({ type: 'setAddElderOpen', payload: true }), []);
  const closeAddElder = useCallback(() => dispatch({ type: 'setAddElderOpen', payload: false }), []);

  const saveSettings = useCallback(
    (settings: Partial<AppSettings>) => {
      const merged = { ...state.settings, ...settings };
      if (merged.mode === 'demo') {
        merged.useMock = true;
      }
      dispatch({ type: 'mergeSettings', payload: settings });
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      pushToast({ type: 'success', title: '设置已保存', description: '新设置已生效。' });
    },
    [pushToast, state.settings]
  );

  useEffect(() => {
    if (state.recordingState !== 'recording') return;
    const timer = window.setInterval(() => {
      dispatch({ type: 'setRecordingSeconds', payload: state.recordingSeconds + 1 });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state.recordingSeconds, state.recordingState]);

  const value = useMemo<AppStoreValue>(
    () => ({
      state,
      initialize,
      selectElder,
      selectDate,
      selectSession,
      setSearchKeyword,
      setActiveSegment,
      setActiveSourceRef,
      setCurrentPage,
      toggleRecording,
      appendTranscriptAndGenerate,
      runExtractAndReport,
      toggleActionItem,
      addElder,
      openSettings,
      closeSettings,
      saveSettings,
      openAddElder,
      closeAddElder,
      pushToast,
      removeToast,
    }),
    [
      addElder,
      appendTranscriptAndGenerate,
      closeAddElder,
      closeSettings,
      initialize,
      openAddElder,
      openSettings,
      removeToast,
      runExtractAndReport,
      saveSettings,
      selectDate,
      selectElder,
      selectSession,
      setActiveSegment,
      setActiveSourceRef,
      setCurrentPage,
      setSearchKeyword,
      state,
      toggleActionItem,
      toggleRecording,
      pushToast,
    ]
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error('useAppStore must be used within AppStoreProvider');
  }
  return context;
}
