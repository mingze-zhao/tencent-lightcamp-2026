import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useAppStore } from '@/state/appStore';
import type { ToastType } from '@/types';
import type { ReactNode } from 'react';

const iconByType: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  warning: <AlertCircle className="h-4 w-4 text-amber-600" />,
  error: <XCircle className="h-4 w-4 text-red-600" />,
  info: <Info className="h-4 w-4 text-blue-600" />,
};

export default function ToastHost() {
  const {
    state: { notifications, settings },
    removeToast,
  } = useAppStore();

  useEffect(() => {
    if (notifications.length === 0) return;
    const timeout = window.setTimeout(() => {
      removeToast(notifications[notifications.length - 1].id);
    }, 2800);
    return () => window.clearTimeout(timeout);
  }, [notifications, removeToast]);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2">
      <AnimatePresence initial={!settings.reducedMotion}>
        {notifications.map((toast) => (
          <motion.div
            key={toast.id}
            initial={settings.reducedMotion ? false : { opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={settings.reducedMotion ? {} : { opacity: 0, x: 16 }}
            className="pointer-events-auto rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{iconByType[toast.type]}</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-0.5 text-xs text-slate-600">{toast.description}</p>
                ) : null}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
