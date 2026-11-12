import { useId, type SelectHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options?: SelectOption[];
  leftIcon?: ReactNode;
  placeholder?: string;
}

export function Select({
  id: customId,
  label,
  helperText,
  error,
  options,
  children,
  className,
  leftIcon,
  placeholder,
  disabled,
  ...props
}: SelectProps) {
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

        <select
          id={id}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? errorId : helperText ? helperId : undefined
          }
          className={cn(
            'w-full h-11 px-3.5 pr-10 rounded-xl auth-form-field text-sm appearance-none cursor-pointer transition-all duration-150',
            'border shadow-2xs',
            'focus:outline-none focus:ring-2 focus:ring-primary/20',
            error &&
              'border-red-500 text-red-900 focus:ring-red-500/20',
            leftIcon ? 'pl-10' : undefined,
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options
            ? options.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                >
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        {/* Custom Chevron Indicator */}
        <div className="absolute right-3.5 pointer-events-none text-stone-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-5"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
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
