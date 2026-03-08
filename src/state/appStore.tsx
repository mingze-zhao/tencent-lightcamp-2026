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
import type { AppSettings, ElderProfile, RecordingState, ToastMessage, VisitSession } from '@/types';

type AppStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AppState {
  status: AppStatus;
  errorMessage?: string;
  elders: ElderProfile[];
  selectedElderId?: string;
  selectedSession?: VisitSession;
  recordingState: RecordingState;
  recordingSeconds: number;
  transcriptSearchKeyword: string;
  activeSegmentId?: string;
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
  | { type: 'setSession'; payload?: VisitSession }
  | { type: 'setRecordingState'; payload: RecordingState }
  | { type: 'setRecordingSeconds'; payload: number }
  | { type: 'setSearchKeyword'; payload: string }
  | { type: 'setActiveSegment'; payload?: string }
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
};

const initialState: AppState = {
  status: 'idle',
  elders: [],
  recordingState: 'idle',
  recordingSeconds: 0,
  transcriptSearchKeyword: '',
  notifications: [],
  isSettingsOpen: false,
  isAddElderOpen: false,
  settings: defaultSettings,
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
    case 'setSession':
      return { ...state, selectedSession: action.payload };
    case 'setRecordingState':
      return { ...state, recordingState: action.payload };
    case 'setRecordingSeconds':
      return { ...state, recordingSeconds: action.payload };
    case 'setSearchKeyword':
      return { ...state, transcriptSearchKeyword: action.payload };
    case 'setActiveSegment':
      return { ...state, activeSegmentId: action.payload };
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
  setSearchKeyword: (keyword: string) => void;
  setActiveSegment: (segmentId?: string) => void;
  toggleRecording: () => Promise<void>;
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
        pushToast({
          type: 'warning',
          title: 'API 未接入',
          description: error.message,
        });
        return;
      }
      const message = error instanceof Error ? error.message : '未知错误';
      dispatch({ type: 'setError', payload: message });
      pushToast({ type: 'error', title: '操作失败', description: message });
    },
    [pushToast]
  );

  const initialize = useCallback(async () => {
    dispatch({ type: 'setStatus', payload: 'loading' });
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        dispatch({ type: 'mergeSettings', payload: JSON.parse(stored) as Partial<AppSettings> });
      }
      const useMock = stored ? (JSON.parse(stored) as Partial<AppSettings>).useMock ?? true : true;
      const apiBaseUrl = stored ? (JSON.parse(stored) as Partial<AppSettings>).apiBaseUrl ?? '' : '';
      const elders = await ApiService.getElders({ useMock, baseUrl: apiBaseUrl });
      dispatch({ type: 'setElders', payload: elders });
      dispatch({ type: 'setStatus', payload: 'ready' });
      if (elders.length > 0) {
        await selectElder(elders[0].id, { useMock, apiBaseUrl });
      }
    } catch (error) {
      dispatch({ type: 'setStatus', payload: 'error' });
      handleApiError(error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectElder = useCallback(
    async (elderId: string, override?: { useMock: boolean; apiBaseUrl: string }) => {
      dispatch({ type: 'setSelectedElder', payload: elderId });
      dispatch({ type: 'setSession', payload: undefined });
      dispatch({ type: 'setStatus', payload: 'loading' });
      try {
        const session = await ApiService.getSession(elderId, {
          useMock: override?.useMock ?? state.settings.useMock,
          baseUrl: override?.apiBaseUrl ?? state.settings.apiBaseUrl,
        });
        dispatch({ type: 'setSession', payload: session ?? undefined });
        dispatch({ type: 'setStatus', payload: 'ready' });
      } catch (error) {
        dispatch({ type: 'setStatus', payload: 'error' });
        handleApiError(error);
      }
    },
    [handleApiError, state.settings.apiBaseUrl, state.settings.useMock]
  );

  const setSearchKeyword = useCallback((keyword: string) => {
    dispatch({ type: 'setSearchKeyword', payload: keyword });
  }, []);

  const setActiveSegment = useCallback((segmentId?: string) => {
    dispatch({ type: 'setActiveSegment', payload: segmentId });
  }, []);

  const toggleRecording = useCallback(async () => {
    if (state.recordingState === 'recording') {
      dispatch({ type: 'setRecordingState', payload: 'transcribing' });
      try {
        const fakeAudio = new File(['mock'], 'mock.wav', { type: 'audio/wav' });
        await ApiService.transcribeAudio(fakeAudio, {
          useMock: state.settings.useMock,
          baseUrl: state.settings.apiBaseUrl,
        });
        await new Promise((resolve) => setTimeout(resolve, 600));
        dispatch({ type: 'setRecordingState', payload: 'completed' });
        pushToast({ type: 'success', title: '录音已停止', description: '已完成转写（Mock）' });
      } catch (error) {
        dispatch({ type: 'setRecordingState', payload: 'error' });
        handleApiError(error);
      }
      return;
    }
    dispatch({ type: 'setRecordingSeconds', payload: 0 });
    dispatch({ type: 'setRecordingState', payload: 'recording' });
    pushToast({ type: 'info', title: '开始录音', description: '再次点击可停止并进入转写流程' });
  }, [handleApiError, pushToast, state.recordingState, state.settings.apiBaseUrl, state.settings.useMock]);

  const runExtractAndReport = useCallback(async () => {
    if (!state.selectedSession) {
      pushToast({ type: 'warning', title: '无可处理会话', description: '请先选择一位长者会话。' });
      return;
    }
    dispatch({ type: 'setRecordingState', payload: 'extracting' });
    try {
      const extract = await ApiService.extractInsights(state.selectedSession, {
        useMock: state.settings.useMock,
        baseUrl: state.settings.apiBaseUrl,
      });
      const report = await ApiService.generateReport(extract, {
        useMock: state.settings.useMock,
        baseUrl: state.settings.apiBaseUrl,
      });
      dispatch({
        type: 'setSession',
        payload: { ...state.selectedSession, extractResult: extract, report },
      });
      dispatch({ type: 'setRecordingState', payload: 'completed' });
      pushToast({ type: 'success', title: '报告已生成', description: '结构化信息与报告已更新。' });
    } catch (error) {
      dispatch({ type: 'setRecordingState', payload: 'error' });
      handleApiError(error);
    }
  }, [handleApiError, pushToast, state.selectedSession, state.settings.apiBaseUrl, state.settings.useMock]);

  const toggleActionItem = useCallback(
    async (itemId: string, checked: boolean) => {
      if (!state.selectedSession) return;
      dispatch({ type: 'updateActionItem', payload: { itemId, checked } });
      try {
        await ApiService.updateActionItem(
          state.selectedSession.id,
          itemId,
          checked,
          { useMock: state.settings.useMock, baseUrl: state.settings.apiBaseUrl }
        );
      } catch (error) {
        handleApiError(error);
      }
    },
    [handleApiError, state.selectedSession, state.settings.apiBaseUrl, state.settings.useMock]
  );

  const addElder = useCallback(
    async (payload: Omit<ElderProfile, 'id'>) => {
      try {
        const created = await ApiService.createElder(payload, {
          useMock: state.settings.useMock,
          baseUrl: state.settings.apiBaseUrl,
        });
        dispatch({ type: 'setElders', payload: [created, ...state.elders] });
        dispatch({ type: 'setAddElderOpen', payload: false });
        pushToast({ type: 'success', title: '已新增长者档案', description: `${created.name} 已加入列表。` });
      } catch (error) {
        handleApiError(error);
      }
    },
    [handleApiError, pushToast, state.elders, state.settings.apiBaseUrl, state.settings.useMock]
  );

  const openSettings = useCallback(() => dispatch({ type: 'setSettingsOpen', payload: true }), []);
  const closeSettings = useCallback(() => dispatch({ type: 'setSettingsOpen', payload: false }), []);
  const openAddElder = useCallback(() => dispatch({ type: 'setAddElderOpen', payload: true }), []);
  const closeAddElder = useCallback(() => dispatch({ type: 'setAddElderOpen', payload: false }), []);

  const saveSettings = useCallback((settings: Partial<AppSettings>) => {
    const merged = { ...state.settings, ...settings };
    dispatch({ type: 'mergeSettings', payload: settings });
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
    pushToast({ type: 'success', title: '设置已保存', description: '新设置已生效。' });
  }, [pushToast, state.settings]);

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
      setSearchKeyword,
      setActiveSegment,
      toggleRecording,
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
      closeAddElder,
      closeSettings,
      initialize,
      openAddElder,
      openSettings,
      removeToast,
      runExtractAndReport,
      saveSettings,
      selectElder,
      setActiveSegment,
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
