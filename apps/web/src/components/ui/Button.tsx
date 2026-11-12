import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  leftIcon,
  rightIcon,
  type = 'button',
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 select-none active:scale-[0.985] shrink-0 whitespace-nowrap';

  const variants = {
    primary:
      'bg-primary text-white hover:bg-primary-hover active:bg-primary-active shadow-xs hover:shadow-sm hover:shadow-orange-950/10',
    secondary:
      'bg-stone-900 text-white hover:bg-stone-800 active:bg-stone-950 shadow-xs hover:shadow-sm hover:shadow-stone-950/10',
    outline:
      'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 hover:border-stone-400 active:bg-stone-100 shadow-2xs',
    ghost:
      'bg-transparent text-stone-700 hover:bg-stone-100 active:bg-stone-200',
    danger:
      'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-xs hover:shadow-sm hover:shadow-red-950/10',
    success:
      'bg-emerald-700 text-white hover:bg-emerald-800 active:bg-emerald-900 shadow-xs hover:shadow-sm hover:shadow-emerald-950/10',
  };

  const sizes = {
    sm: 'h-8 min-h-[32px] px-3 text-xs gap-1.5 rounded-lg',
    md: 'h-10 min-h-[40px] px-4 text-sm gap-2 rounded-xl',
    lg: 'h-11 min-h-[44px] px-5 text-sm font-semibold gap-2.5 rounded-xl',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading ? (
        <span
          className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        leftIcon && <span className="shrink-0 inline-flex items-center justify-center">{leftIcon}</span>
      )}
      <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap leading-none">
        {children}
      </span>
      {!isLoading && rightIcon && (
        <span className="shrink-0 inline-flex items-center justify-center">{rightIcon}</span>
      )}
    </button>
  );
}
