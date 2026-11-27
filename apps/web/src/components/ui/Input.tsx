import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Input({
  id: customId,
  label,
  helperText,
  error,
  className,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: InputProps) {
  const generatedId = useId();
  const id = customId || generatedId;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-stone-900 select-none"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 pointer-events-none text-stone-600">
            {leftIcon}
          </div>
        )}

        <input
          id={id}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? errorId : helperText ? helperId : undefined
          }
          className={cn(
            'w-full h-11 px-3.5 rounded-xl auth-form-field text-sm transition-all duration-150',
            'border shadow-2xs',
            'focus:outline-none focus:ring-2 focus:ring-primary/20',
            error &&
              'border-red-500 text-red-900 focus:ring-red-500/20',
            leftIcon ? 'pl-10' : undefined,
            rightIcon ? 'pr-10' : undefined,
            className
          )}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3.5 pointer-events-none text-stone-600">
            {rightIcon}
          </div>
        )}
      </div>

      {error ? (
        <p id={errorId} className="text-xs text-red-700 font-medium mt-0.5">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-stone-600 mt-0.5">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
