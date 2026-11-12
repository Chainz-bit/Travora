import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import {
  AlertCircleIcon,
  CheckIcon,
  ClockIcon,
  InfoIcon,
  XIcon,
} from './Icons';

export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface StatusBadgeProps {
  status: StatusVariant;
  children: ReactNode;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export function StatusBadge({
  status,
  children,
  className,
  showIcon = true,
  size = 'md',
}: StatusBadgeProps) {
  const configs: Record<StatusVariant, { className: string; icon: ReactNode }> = {
    success: {
      className: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
      icon: <CheckIcon className="size-3.5 shrink-0 text-emerald-600" />,
    },
    warning: {
      className: 'bg-amber-50 text-amber-800 border-amber-200/90',
      icon: <ClockIcon className="size-3.5 shrink-0 text-amber-600" />,
    },
    error: {
      className: 'bg-red-50 text-red-800 border-red-200/90',
      icon: <XIcon className="size-3.5 shrink-0 text-red-600" />,
    },
    info: {
      className: 'bg-sky-50 text-sky-800 border-sky-200/90',
      icon: <InfoIcon className="size-3.5 shrink-0 text-sky-600" />,
    },
    neutral: {
      className: 'bg-stone-100 text-stone-700 border-stone-200/90',
      icon: <AlertCircleIcon className="size-3.5 shrink-0 text-stone-500" />,
    },
  };

  const sizes = {
    sm: 'px-2.5 py-0.5 text-[11px] gap-1',
    md: 'px-3 py-1 text-xs gap-1.5',
  };

  const current = configs[status] || configs.neutral;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-full border select-none tracking-tight whitespace-nowrap shadow-2xs leading-normal',
        sizes[size],
        current.className,
        className
      )}
    >
      {showIcon && current.icon}
      <span>{children}</span>
    </span>
  );
}
