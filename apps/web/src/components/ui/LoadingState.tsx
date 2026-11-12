import { cn } from '../../lib/utils';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = 'Memuat data jadwal perjalanan...',
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'w-full flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-stone-200/90 gap-4 text-center shadow-xs',
        className
      )}
    >
      <div
        className="size-9 animate-spin rounded-full border-2 border-stone-200 border-t-primary"
        aria-hidden="true"
      />
      <p className="text-xs font-medium text-stone-700 tracking-tight">{message}</p>
      <span className="sr-only">Sedang memproses...</span>
    </div>
  );
}

export function ScheduleCardSkeleton() {
  return (
    <div
      className="w-full bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 animate-pulse shadow-xs"
      aria-hidden="true"
    >
      <div className="flex-1 space-y-3.5">
        <div className="flex items-center gap-3">
          <div className="h-6 w-24 bg-stone-200 rounded-lg" />
          <div className="h-5 w-28 bg-stone-100 rounded-lg" />
          <div className="h-5 w-24 bg-stone-100 rounded-full" />
        </div>
        <div className="h-5 w-52 bg-stone-200 rounded-md" />
        <div className="h-4 w-36 bg-stone-100 rounded-md" />
      </div>
      <div className="flex items-center justify-between md:flex-col md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-stone-100">
        <div className="space-y-1 text-right">
          <div className="h-3 w-16 bg-stone-100 rounded ml-auto" />
          <div className="h-6 w-28 bg-stone-200 rounded-md" />
        </div>
        <div className="h-10 w-32 bg-stone-200 rounded-xl" />
      </div>
    </div>
  );
}

