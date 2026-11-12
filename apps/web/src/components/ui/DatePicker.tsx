import { useId, type InputHTMLAttributes } from 'react';
import { cn, getTodayDateString } from '../../lib/utils';
import { CalendarIcon } from './Icons';

export interface DatePickerProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
  error?: string;
}

export function DatePicker({
  id: customId,
  label,
  helperText,
  error,
  className,
  disabled,
  min,
  ...props
}: DatePickerProps) {
  const generatedId = useId();
  const id = customId || generatedId;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const minDate = min || getTodayDateString();

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

      <div className="relative flex items-center w-full">
        <div className="absolute left-3 pointer-events-none text-stone-600 flex items-center justify-center">
          <CalendarIcon className="size-4" />
        </div>

        <input
          id={id}
          type="date"
          min={minDate}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? errorId : helperText ? helperId : undefined
          }
          className={cn(
            'w-full h-11 pl-9.5 pr-3 rounded-xl auth-form-field text-sm font-sans tabular-nums transition-all duration-150 cursor-pointer',
            'border shadow-2xs',
            'focus:outline-none focus:ring-2 focus:ring-primary/20',
            '[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100',
            error &&
              'border-red-500 text-red-900 focus:ring-red-500/20',
            className
          )}
          {...props}
        />
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

