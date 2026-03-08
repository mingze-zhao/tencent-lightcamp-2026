import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/state/appStore';
import type { AppSettings } from '@/types';

export default function SettingsPanel() {
  const {
    state: { isSettingsOpen, settings },
    closeSettings,
    saveSettings,
  } = useAppStore();

  const [formState, setFormState] = useState<AppSettings>(settings);

  useEffect(() => {
    setFormState(settings);
  }, [settings, isSettingsOpen]);

  if (!isSettingsOpen) return null;

  const setField = <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <button
        className="h-full flex-1 bg-slate-950/30"
        onClick={closeSettings}
        aria-label="关闭设置面板背景"
      />
      <aside className="flex h-full w-[420px] max-w-[92vw] flex-col border-l border-slate-200 bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">设置</h2>
            <p className="text-xs text-slate-500">展示、动画、音频、报告、API 配置</p>
          </div>
          <button
            aria-label="关闭设置面板"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            onClick={closeSettings}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">展示</h3>
            <label className="flex items-center justify-between text-sm text-slate-700">
              <span>紧凑模式</span>
              <input
                type="checkbox"
                checked={formState.compactMode}
                onChange={(event) => setField('compactMode', event.target.checked)}
              />
            </label>
            <label className="block text-sm text-slate-700">
              <span>字体缩放（{formState.fontScale}%）</span>
              <input
                className="mt-2 w-full"
                type="range"
                min={90}
                max={120}
                step={5}
                value={formState.fontScale}
                onChange={(event) => setField('fontScale', Number(event.target.value))}
              />
            </label>
            <label className="flex items-center justify-between text-sm text-slate-700">
              <span>高对比度</span>
              <input
                type="checkbox"
                checked={formState.highContrast}
                onChange={(event) => setField('highContrast', event.target.checked)}
              />
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">动画与交互</h3>
            <label className="flex items-center justify-between text-sm text-slate-700">
              <span>减少动效</span>
              <input
                type="checkbox"
                checked={formState.reducedMotion}
                onChange={(event) => setField('reducedMotion', event.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between text-sm text-slate-700">
              <span>自动生成报告</span>
              <input
                type="checkbox"
                checked={formState.autoGenerateReport}
                onChange={(event) => setField('autoGenerateReport', event.target.checked)}
              />
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">音频设置（占位）</h3>
            <label className="flex items-center justify-between text-sm text-slate-700">
              <span>降噪</span>
              <input
                type="checkbox"
                checked={formState.noiseReduction}
                onChange={(event) => setField('noiseReduction', event.target.checked)}
              />
            </label>
            <label className="block text-sm text-slate-700">
              <span>采样率</span>
              <select
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={formState.sampleRate}
                onChange={(event) => setField('sampleRate', event.target.value as AppSettings['sampleRate'])}
              >
                <option value="16k">16k</option>
                <option value="44.1k">44.1k</option>
              </select>
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">报告设置</h3>
            <label className="block text-sm text-slate-700">
              <span>默认语言</span>
              <select
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={formState.reportLanguage}
                onChange={(event) =>
                  setField('reportLanguage', event.target.value as AppSettings['reportLanguage'])
                }
              >
                <option value="zh-HK">繁体中文</option>
                <option value="zh-HK+en">繁中 + 英文</option>
              </select>
            </label>
            <label className="block text-sm text-slate-700">
              <span>模板</span>
              <select
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={formState.reportTemplate}
                onChange={(event) =>
                  setField('reportTemplate', event.target.value as AppSettings['reportTemplate'])
                }
              >
                <option value="standard">标准模板</option>
                <option value="detailed">详细模板</option>
              </select>
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">运行模式</h3>
            <label className="block text-sm text-slate-700">
              <span>模式</span>
              <select
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={formState.mode}
                onChange={(event) => setField('mode', event.target.value as AppSettings['mode'])}
              >
                <option value="demo">演示模式（Mock + 演示数据）</option>
                <option value="live">实机模式（真实接口）</option>
              </select>
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">接口设置</h3>
            <label className="flex items-center justify-between text-sm text-slate-700">
              <span>使用 Mock 数据</span>
              <input
                type="checkbox"
                checked={formState.useMock}
                onChange={(event) => setField('useMock', event.target.checked)}
              />
            </label>
            <label className="block text-sm text-slate-700">
              <span>API Base URL（留空则提示 API 未接入）</span>
              <input
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={formState.apiBaseUrl}
                placeholder="例如: http://localhost:8000"
                onChange={(event) => setField('apiBaseUrl', event.target.value)}
              />
            </label>
          </section>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={closeSettings}
          >
            取消
          </button>
          <button
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            onClick={() => {
              saveSettings(formState);
              closeSettings();
            }}
          >
            保存设置
          </button>
        </footer>
      </aside>
    </div>
  );
}
