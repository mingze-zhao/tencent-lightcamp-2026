import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useReducer,
  type PropsWithChildren,
} from 'react';
import { ApiNotImplementedError, ApiService } from '@/services/api';
import type {
  AppSettings,
  BodyFinding,
  CalendarDay,
  CommunityBodyStat,
  ElderProfile,
  RecordingState,
  StructuredItemType,
  SourceRef,
  ToastMessage,
  VisitSession,
} from '@/types';

type AppStatus = 'idle' | 'loading' | 'ready' | 'error';
type PageKey = 'workbench' | 'community' | 'archive';
type SavingState = 'idle' | 'saving' | 'error';
type FieldSavingStatus = 'saving' | 'error';

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
  isEditMode: boolean;
  dirtyMap: Record<string, true>;
  perFieldSavingMap: Record<string, { status: FieldSavingStatus; operationId: string; message?: string }>;
  savingState: SavingState;
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
  | { type: 'setEditMode'; payload: boolean }
  | { type: 'setSavingState'; payload: SavingState }
  | {
      type: 'setFieldSaving';
      payload: {
        fieldPath: string;
        status: FieldSavingStatus;
        operationId: string;
        message?: string;
      };
    }
  | { type: 'clearFieldSaving'; payload: { fieldPath: string; operationId?: string } }
  | { type: 'markDirty'; payload: string }
  | { type: 'clearDirty'; payload?: string }
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
  apiBaseUrl: 'http://localhost:8787',
  showDemoData: true,
  autoGenerateReport: false,
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
  isEditMode: false,
  dirtyMap: {},
  perFieldSavingMap: {},
  savingState: 'idle',
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
    case 'setEditMode':
      return { ...state, isEditMode: action.payload };
    case 'setSavingState':
      return { ...state, savingState: action.payload };
    case 'setFieldSaving':
      return {
        ...state,
        perFieldSavingMap: {
          ...state.perFieldSavingMap,
          [action.payload.fieldPath]: {
            status: action.payload.status,
            operationId: action.payload.operationId,
            message: action.payload.message,
          },
        },
      };
    case 'clearFieldSaving': {
      const existing = state.perFieldSavingMap[action.payload.fieldPath];
      if (!existing) return state;
      if (action.payload.operationId && existing.operationId !== action.payload.operationId) return state;
      const next = { ...state.perFieldSavingMap };
      delete next[action.payload.fieldPath];
      return { ...state, perFieldSavingMap: next };
    }
    case 'markDirty':
      return { ...state, dirtyMap: { ...state.dirtyMap, [action.payload]: true } };
    case 'clearDirty': {
      if (!action.payload) return { ...state, dirtyMap: {} };
      const next = { ...state.dirtyMap };
      delete next[action.payload];
      return { ...state, dirtyMap: next };
    }
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
  updateElderFields: (elderId: string, patch: Partial<ElderProfile>) => void;
  updateTranscriptSegmentText: (sessionId: string, segmentId: string, text: string) => void;
  updateInsightBlockFields: (sessionId: string, blockId: string, patch: { title?: string; summary?: string }) => void;
  updateWarningContent: (sessionId: string, warningIndex: number, content: string) => void;
  updateBodyFindingFields: (
    sessionId: string,
    findingId: string,
    patch: { label?: string; status?: 'new' | 'ongoing' | 'resolved' }
  ) => void;
  updateActionItemFields: (
    sessionId: string,
    itemId: string,
    patch: { content?: string; checked?: boolean }
  ) => void;
  addStructuredItem: (
    sessionId: string,
    type: StructuredItemType,
    payload?: { sourceRefIds?: string[]; segmentIds?: string[] }
  ) => Promise<void>;
  deleteStructuredItem: (
    sessionId: string,
    type: StructuredItemType,
    itemIdOrIndex: string | number
  ) => Promise<void>;
  quickAddStructuredFromTranscript: (
    sessionId: string,
    segmentId: string,
    selectedText: string,
    type: StructuredItemType,
    range?: { startChar: number; endChar: number }
  ) => Promise<void>;
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
  setEditMode: (enabled: boolean) => void;
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);
const makeToastId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const saveTimersRef = useRef<Record<string, number>>({});
  const fieldOpRef = useRef<Record<string, string>>({});

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
    (override?: { apiBaseUrl: string; showDemoData: boolean }) => ({
      baseUrl: override?.apiBaseUrl ?? state.settings.apiBaseUrl,
      showDemoData: override?.showDemoData ?? state.settings.showDemoData,
    }),
    [state.settings.apiBaseUrl, state.settings.showDemoData]
  );

  const refreshCommunityStats = useCallback(async (override?: { apiBaseUrl: string; showDemoData: boolean }) => {
    const stats = await ApiService.getCommunityBodyStats(resolveCtx(override));
    dispatch({ type: 'setCommunityStats', payload: stats });
  }, [resolveCtx]);

  const selectElder = useCallback(
    async (elderId: string, override?: { apiBaseUrl: string; showDemoData: boolean }) => {
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
            apiBaseUrl: (JSON.parse(stored) as Partial<AppSettings>).apiBaseUrl ?? '',
            showDemoData: (JSON.parse(stored) as Partial<AppSettings>).showDemoData ?? true,
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
      await refreshCommunityStats(override);
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

  const scheduleSave = useCallback(
    (
      fieldPath: string,
      worker: () => Promise<void>,
      rollback: () => void
    ) => {
      const operationId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      fieldOpRef.current[fieldPath] = operationId;
      dispatch({ type: 'markDirty', payload: fieldPath });
      dispatch({ type: 'setFieldSaving', payload: { fieldPath, status: 'saving', operationId } });
      dispatch({ type: 'setSavingState', payload: 'saving' });

      const prev = saveTimersRef.current[fieldPath];
      if (prev) window.clearTimeout(prev);
      saveTimersRef.current[fieldPath] = window.setTimeout(async () => {
        try {
          await worker();
          dispatch({ type: 'clearDirty', payload: fieldPath });
          dispatch({ type: 'clearFieldSaving', payload: { fieldPath, operationId } });
          const hasDirty = Object.keys(state.dirtyMap).some((key) => key !== fieldPath);
          dispatch({ type: 'setSavingState', payload: hasDirty ? 'saving' : 'idle' });
        } catch (error) {
          if (fieldOpRef.current[fieldPath] === operationId) {
            rollback();
          }
          dispatch({
            type: 'setFieldSaving',
            payload: {
              fieldPath,
              status: 'error',
              operationId,
              message: `保存失败：${fieldPath}`,
            },
          });
          dispatch({ type: 'setSavingState', payload: 'error' });
          pushToast({
            type: 'error',
            title: `保存失败：${fieldPath}`,
            description: error instanceof Error ? error.message : '未知错误',
          });
        }
      }, 600);
    },
    [pushToast, state.dirtyMap]
  );

  const updateElderFields = useCallback(
    (elderId: string, patch: Partial<ElderProfile>) => {
      const previous = state.elders.find((elder) => elder.id === elderId);
      if (!previous) return;
      dispatch({
        type: 'setElders',
        payload: state.elders.map((elder) => (elder.id === elderId ? { ...elder, ...patch } : elder)),
      });
      const patchEntries = Object.entries(patch);
      patchEntries.forEach(([fieldName]) => {
        const fieldPath = `elder:${elderId}.${fieldName}`;
        scheduleSave(
          fieldPath,
          async () => {
            await ApiService.updateElder(elderId, patch, resolveCtx());
          },
          () => {
            dispatch({
              type: 'setElders',
              payload: state.elders.map((elder) =>
                elder.id === elderId ? { ...elder, [fieldName]: previous[fieldName as keyof ElderProfile] } : elder
              ),
            });
          }
        );
      });
    },
    [resolveCtx, scheduleSave, state.elders]
  );

  const updateTranscriptSegmentText = useCallback(
    (sessionId: string, segmentId: string, text: string) => {
      if (!state.selectedSession || state.selectedSession.id !== sessionId) return;
      const next: VisitSession = {
        ...state.selectedSession,
        transcript: state.selectedSession.transcript.map((seg) => (seg.id === segmentId ? { ...seg, text } : seg)),
      };
      const previous = state.selectedSession.transcript.find((seg) => seg.id === segmentId)?.text ?? '';
      patchSelectedSession(next);
      scheduleSave(
        `transcript:${segmentId}.text`,
        async () => {
          await ApiService.updateTranscriptSegment(sessionId, segmentId, { text }, resolveCtx());
        },
        () => {
          if (!state.selectedSession || state.selectedSession.id !== sessionId) return;
          patchSelectedSession({
            ...state.selectedSession,
            transcript: state.selectedSession.transcript.map((seg) =>
              seg.id === segmentId ? { ...seg, text: previous } : seg
            ),
          });
        }
      );
    },
    [patchSelectedSession, resolveCtx, scheduleSave, state.selectedSession]
  );

  const updateInsightBlockFields = useCallback(
    (sessionId: string, blockId: string, patch: { title?: string; summary?: string }) => {
      if (!state.selectedSession || state.selectedSession.id !== sessionId || !state.selectedSession.extractResult) return;
      const blocks = (state.selectedSession.extractResult.insightBlocks ?? []).map((item) =>
        item.id === blockId ? { ...item, ...patch } : item
      );
      const previous = (state.selectedSession.extractResult.insightBlocks ?? []).find((item) => item.id === blockId);
      if (!previous) return;
      patchSelectedSession({
        ...state.selectedSession,
        extractResult: { ...state.selectedSession.extractResult, insightBlocks: blocks },
      });
      Object.keys(patch).forEach((fieldName) => {
        const fieldPath = `insight:${blockId}.${fieldName}`;
        scheduleSave(
          fieldPath,
          async () => {
            await ApiService.updateInsightBlock(sessionId, blockId, patch, resolveCtx());
          },
          () => {
            if (!state.selectedSession || state.selectedSession.id !== sessionId || !state.selectedSession.extractResult)
              return;
            const rollbackBlocks = (state.selectedSession.extractResult.insightBlocks ?? []).map((item) =>
              item.id === blockId ? { ...item, [fieldName]: previous[fieldName as keyof typeof previous] } : item
            );
            patchSelectedSession({
              ...state.selectedSession,
              extractResult: { ...state.selectedSession.extractResult, insightBlocks: rollbackBlocks },
            });
          }
        );
      });
    },
    [patchSelectedSession, resolveCtx, scheduleSave, state.selectedSession]
  );

  const updateWarningContent = useCallback(
    (sessionId: string, warningIndex: number, content: string) => {
      if (!state.selectedSession || state.selectedSession.id !== sessionId || !state.selectedSession.extractResult) return;
      const warnings = state.selectedSession.extractResult.warnings.map((item, idx) => (idx === warningIndex ? content : item));
      const previous = state.selectedSession.extractResult.warnings[warningIndex] ?? '';
      patchSelectedSession({
        ...state.selectedSession,
        extractResult: { ...state.selectedSession.extractResult, warnings },
      });
      scheduleSave(
        `warning[${warningIndex}].content`,
        async () => {
          await ApiService.updateWarning(sessionId, warningIndex, content, resolveCtx());
        },
        () => {
          if (!state.selectedSession || state.selectedSession.id !== sessionId || !state.selectedSession.extractResult)
            return;
          const rollbackWarnings = state.selectedSession.extractResult.warnings.map((item, idx) =>
            idx === warningIndex ? previous : item
          );
          patchSelectedSession({
            ...state.selectedSession,
            extractResult: { ...state.selectedSession.extractResult, warnings: rollbackWarnings },
          });
        }
      );
    },
    [patchSelectedSession, resolveCtx, scheduleSave, state.selectedSession]
  );

  const updateBodyFindingFields = useCallback(
    (sessionId: string, findingId: string, patch: { label?: string; status?: 'new' | 'ongoing' | 'resolved' }) => {
      if (!state.selectedSession || state.selectedSession.id !== sessionId || !state.selectedSession.bodyMapSnapshot) return;
      const findings = state.selectedSession.bodyMapSnapshot.findings.map((item) =>
        item.id === findingId ? { ...item, ...patch } : item
      );
      const previous = state.selectedSession.bodyMapSnapshot.findings.find((item) => item.id === findingId);
      if (!previous) return;
      patchSelectedSession({
        ...state.selectedSession,
        bodyMapSnapshot: { ...state.selectedSession.bodyMapSnapshot, findings },
      });
      Object.keys(patch).forEach((fieldName) => {
        const fieldPath = `bodyFinding:${findingId}.${fieldName}`;
        scheduleSave(
          fieldPath,
          async () => {
            await ApiService.updateBodyFinding(sessionId, findingId, patch, resolveCtx());
          },
          () => {
            if (!state.selectedSession || state.selectedSession.id !== sessionId || !state.selectedSession.bodyMapSnapshot)
              return;
            const rollbackFindings = state.selectedSession.bodyMapSnapshot.findings.map((item) =>
              item.id === findingId ? { ...item, [fieldName]: previous[fieldName as keyof typeof previous] } : item
            );
            patchSelectedSession({
              ...state.selectedSession,
              bodyMapSnapshot: { ...state.selectedSession.bodyMapSnapshot, findings: rollbackFindings },
            });
          }
        );
      });
    },
    [patchSelectedSession, resolveCtx, scheduleSave, state.selectedSession]
  );

  const updateActionItemFields = useCallback(
    (sessionId: string, itemId: string, patch: { content?: string; checked?: boolean }) => {
      if (!state.selectedSession || state.selectedSession.id !== sessionId || !state.selectedSession.extractResult) return;
      const actionItems = state.selectedSession.extractResult.action_items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...(patch.content === undefined ? {} : { content: patch.content }),
              ...(patch.checked === undefined
                ? {}
                : { status: (patch.checked ? 'completed' : 'pending') as 'completed' | 'pending' }),
            }
          : item
      );
      const previous = state.selectedSession.extractResult.action_items.find((item) => item.id === itemId);
      if (!previous) return;
      patchSelectedSession({
        ...state.selectedSession,
        extractResult: { ...state.selectedSession.extractResult, action_items: actionItems },
      });
      Object.keys(patch).forEach((fieldName) => {
        const fieldPath = `actionItem:${itemId}.${fieldName === 'checked' ? 'status' : fieldName}`;
        scheduleSave(
          fieldPath,
          async () => {
            await ApiService.updateActionItemDetail(
              sessionId,
              itemId,
              { checked: patch.checked, content: patch.content },
              resolveCtx()
            );
          },
          () => {
            if (!state.selectedSession || state.selectedSession.id !== sessionId || !state.selectedSession.extractResult)
              return;
            const rollbackActionItems = state.selectedSession.extractResult.action_items.map((item) =>
              item.id === itemId ? { ...item, content: previous.content, status: previous.status } : item
            );
            patchSelectedSession({
              ...state.selectedSession,
              extractResult: { ...state.selectedSession.extractResult, action_items: rollbackActionItems },
            });
          }
        );
      });
    },
    [patchSelectedSession, resolveCtx, scheduleSave, state.selectedSession]
  );

  const ensureSourceRefForSegment = useCallback(
    async (
      sessionId: string,
      segmentId: string,
      selectedText: string,
      range?: { startChar: number; endChar: number }
    ): Promise<SourceRef | null> => {
      const segment = state.selectedSession?.transcript.find((item) => item.id === segmentId);
      if (!segment) return null;
      const start = range?.startChar ?? Math.max(0, segment.text.indexOf(selectedText));
      const end =
        range?.endChar ??
        (start >= 0 ? Math.min(segment.text.length - 1, start + Math.max(selectedText.length - 1, 0)) : segment.text.length - 1);
      const sourceRef = await ApiService.createSourceRef(
        sessionId,
        {
          segmentId,
          startChar: Math.max(0, start),
          endChar: Math.max(Math.max(0, start), end),
          text: selectedText || segment.text,
        },
        resolveCtx()
      );
      if (!state.selectedSession || state.selectedSession.id !== sessionId) return sourceRef;
      const existing = state.selectedSession.sourceRefs ?? [];
      patchSelectedSession({
        ...state.selectedSession,
        sourceRefs: [...existing, sourceRef],
      });
      return sourceRef;
    },
    [patchSelectedSession, resolveCtx, state.selectedSession]
  );

  const addStructuredItem = useCallback(
    async (sessionId: string, type: StructuredItemType, payload?: { sourceRefIds?: string[]; segmentIds?: string[] }) => {
      if (!state.selectedSession || state.selectedSession.id !== sessionId || !state.selectedSession.extractResult) return;
      try {
        if (type === 'warning') {
          const created = await ApiService.createWarning(
            sessionId,
            { content: '新预警（待编辑）', severity: 'medium', sourceRefIds: payload?.sourceRefIds },
            resolveCtx()
          );
          const warnings = [...state.selectedSession.extractResult.warnings, created.content];
          const warningSegmentIds = [
            ...(state.selectedSession.extractResult.warningSegmentIds ?? []),
            payload?.segmentIds ?? [],
          ];
          patchSelectedSession({
            ...state.selectedSession,
            extractResult: { ...state.selectedSession.extractResult, warnings, warningSegmentIds },
          });
        } else if (type === 'insight') {
          const created = await ApiService.createInsightBlock(
            sessionId,
            {
              title: '新结构化块',
              summary: '待补充',
              risk: 'low',
              type: 'symptom',
              sourceRefIds: payload?.sourceRefIds,
            },
            resolveCtx()
          );
          patchSelectedSession({
            ...state.selectedSession,
            extractResult: {
              ...state.selectedSession.extractResult,
              insightBlocks: [...(state.selectedSession.extractResult.insightBlocks ?? []), created],
            },
          });
        } else if (type === 'action_item') {
          const created = await ApiService.createActionItem(
            sessionId,
            { content: '新跟进事项', priority: 'medium', status: 'pending', sourceRefIds: payload?.sourceRefIds },
            resolveCtx()
          );
          patchSelectedSession({
            ...state.selectedSession,
            extractResult: {
              ...state.selectedSession.extractResult,
              action_items: [...state.selectedSession.extractResult.action_items, created],
            },
          });
        } else if (type === 'body_finding') {
          const created = await ApiService.createBodyFinding(
            sessionId,
            {
              part: 'chest',
              label: '新身体发现',
              status: 'ongoing',
              risk: 'medium',
              viewSide: 'front',
              sourceRefIds: payload?.sourceRefIds,
            } as Partial<BodyFinding>,
            resolveCtx()
          );
          patchSelectedSession({
            ...state.selectedSession,
            bodyMapSnapshot: {
              sessionId,
              date: state.selectedSession.date,
              findings: [...(state.selectedSession.bodyMapSnapshot?.findings ?? []), created],
            },
          });
        } else if (type === 'dimension') {
          const created = await ApiService.createDimensionSummary(
            sessionId,
            {
              dimension: `dimension_${Date.now()}`,
              summary: '待补充',
              risk: 'low',
              details: [],
              sourceSegmentIds: payload?.segmentIds ?? [],
            },
            resolveCtx()
          );
          patchSelectedSession({
            ...state.selectedSession,
            extractResult: {
              ...state.selectedSession.extractResult,
              dimensionSummaries: [...(state.selectedSession.extractResult.dimensionSummaries ?? []), created],
            },
          });
        }
      } catch (error) {
        handleApiError(error);
      }
    },
    [handleApiError, patchSelectedSession, resolveCtx, state.selectedSession]
  );

  const deleteStructuredItem = useCallback(
    async (sessionId: string, type: StructuredItemType, itemIdOrIndex: string | number) => {
      if (!state.selectedSession || state.selectedSession.id !== sessionId || !state.selectedSession.extractResult) return;
      try {
        if (type === 'warning') {
          const idx = Number(itemIdOrIndex);
          await ApiService.deleteWarningByIndex(sessionId, idx, resolveCtx());
          patchSelectedSession({
            ...state.selectedSession,
            extractResult: {
              ...state.selectedSession.extractResult,
              warnings: state.selectedSession.extractResult.warnings.filter((_, index) => index !== idx),
              warningSegmentIds: (state.selectedSession.extractResult.warningSegmentIds ?? []).filter(
                (_, index) => index !== idx
              ),
            },
          });
        } else if (type === 'insight') {
          await ApiService.deleteInsightBlock(sessionId, String(itemIdOrIndex), resolveCtx());
          patchSelectedSession({
            ...state.selectedSession,
            extractResult: {
              ...state.selectedSession.extractResult,
              insightBlocks: (state.selectedSession.extractResult.insightBlocks ?? []).filter(
                (item) => item.id !== String(itemIdOrIndex)
              ),
            },
          });
        } else if (type === 'action_item') {
          await ApiService.deleteActionItem(sessionId, String(itemIdOrIndex), resolveCtx());
          patchSelectedSession({
            ...state.selectedSession,
            extractResult: {
              ...state.selectedSession.extractResult,
              action_items: state.selectedSession.extractResult.action_items.filter(
                (item) => item.id !== String(itemIdOrIndex)
              ),
            },
          });
        } else if (type === 'body_finding') {
          await ApiService.deleteBodyFinding(sessionId, String(itemIdOrIndex), resolveCtx());
          patchSelectedSession({
            ...state.selectedSession,
            bodyMapSnapshot: {
              sessionId,
              date: state.selectedSession.date,
              findings: (state.selectedSession.bodyMapSnapshot?.findings ?? []).filter(
                (item) => item.id !== String(itemIdOrIndex)
              ),
            },
          });
        } else if (type === 'dimension') {
          await ApiService.deleteDimensionSummary(sessionId, String(itemIdOrIndex), resolveCtx());
          patchSelectedSession({
            ...state.selectedSession,
            extractResult: {
              ...state.selectedSession.extractResult,
              dimensionSummaries: (state.selectedSession.extractResult.dimensionSummaries ?? []).filter(
                (item) => item.id !== String(itemIdOrIndex)
              ),
            },
          });
        }
      } catch (error) {
        handleApiError(error);
      }
    },
    [handleApiError, patchSelectedSession, resolveCtx, state.selectedSession]
  );

  const quickAddStructuredFromTranscript = useCallback(
    async (
      sessionId: string,
      segmentId: string,
      selectedText: string,
      type: StructuredItemType,
      range?: { startChar: number; endChar: number }
    ) => {
      try {
        const sourceRef = await ensureSourceRefForSegment(sessionId, segmentId, selectedText, range);
        const sourceRefIds = sourceRef ? [sourceRef.id] : [];
        await addStructuredItem(sessionId, type, { sourceRefIds, segmentIds: [segmentId] });
      } catch (error) {
        handleApiError(error);
      }
    },
    [addStructuredItem, ensureSourceRefForSegment, handleApiError]
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
        const incremental = await ApiService.incrementalExtract(
          state.selectedSession.id,
          appended.id,
          appended.text,
          resolveCtx()
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
    [handleApiError, patchSelectedSession, resolveCtx, state.selectedSession]
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
  const setEditMode = useCallback((enabled: boolean) => dispatch({ type: 'setEditMode', payload: enabled }), []);

  const saveSettings = useCallback(
    (settings: Partial<AppSettings>) => {
      const merged = { ...state.settings, ...settings };
      dispatch({ type: 'mergeSettings', payload: merged });
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      pushToast({ type: 'success', title: '设置已保存', description: '新设置已生效。' });
      void initialize();
    },
    [initialize, pushToast, state.settings]
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
      updateElderFields,
      updateTranscriptSegmentText,
      updateInsightBlockFields,
      updateWarningContent,
      updateBodyFindingFields,
      updateActionItemFields,
      addStructuredItem,
      deleteStructuredItem,
      quickAddStructuredFromTranscript,
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
      setEditMode,
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
      setEditMode,
      addStructuredItem,
      deleteStructuredItem,
      quickAddStructuredFromTranscript,
      updateActionItemFields,
      updateBodyFindingFields,
      updateElderFields,
      updateInsightBlockFields,
      updateTranscriptSegmentText,
      updateWarningContent,
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
