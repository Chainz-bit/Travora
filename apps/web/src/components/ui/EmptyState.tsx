import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { BusIcon } from './Icons';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title = 'Tidak Ada Jadwal Ditemukan',
  description = 'Maaf, belum ada jadwal perjalanan untuk rute atau tanggal yang Anda pilih. Silakan pilih tanggal atau rute lain.',
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'w-full flex flex-col items-center justify-center p-10 sm:p-14 bg-white rounded-2xl border border-stone-200/90 text-center gap-4 shadow-xs',
        className
      )}
    >
      <div className="size-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-primary shadow-2xs">
        {icon || <BusIcon className="size-7 text-primary" />}
      </div>
      <div className="max-w-md space-y-1.5">
        <h3 className="font-serif text-lg font-bold text-stone-900 tracking-tight">{title}</h3>
        <p className="text-xs text-stone-500 leading-relaxed max-w-sm mx-auto">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

