import {
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  CheckCircle2Icon,
  AlertCircleIcon,
  InfoIcon,
  XIcon,
} from './Icons';
import {
  ToastContext,
  type ToastItem,
  type ToastType,
} from './useToast';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = { id, message, type, title };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Limit to 5 simultaneous toasts

      setTimeout(() => {
        removeToast(id);
      }, 3500);
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => showToast(message, 'success', title),
    [showToast]
  );
  const error = useCallback(
    (message: string, title?: string) => showToast(message, 'error', title),
    [showToast]
  );
  const info = useCallback(
    (message: string, title?: string) => showToast(message, 'info', title),
    [showToast]
  );
  const warning = useCallback(
    (message: string, title?: string) => showToast(message, 'warning', title),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      {/* Toast Render Viewport */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto w-full p-4 rounded-xl border shadow-lg animate-toast-enter flex items-start gap-3 transition-all duration-200 ${
                isSuccess
                  ? 'bg-white border-emerald-200 text-stone-900 shadow-emerald-950/5'
                  : isError
                  ? 'bg-white border-red-200 text-stone-900 shadow-red-950/5'
                  : isWarning
                  ? 'bg-white border-amber-200 text-stone-900 shadow-amber-950/5'
                  : 'bg-white border-stone-200 text-stone-900 shadow-stone-950/5'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && (
                  <CheckCircle2Icon className="size-5 text-emerald-600" />
                )}
                {isError && (
                  <AlertCircleIcon className="size-5 text-red-600" />
                )}
                {isWarning && (
                  <AlertCircleIcon className="size-5 text-amber-600" />
                )}
                {!isSuccess && !isError && !isWarning && (
                  <InfoIcon className="size-5 text-sky-600" />
                )}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                {toast.title && (
                  <p className="text-xs font-bold text-stone-950 tracking-tight leading-snug">
                    {toast.title}
                  </p>
                )}
                <p className="text-xs text-stone-600 leading-relaxed">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                aria-label="Tutup notifikasi"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
