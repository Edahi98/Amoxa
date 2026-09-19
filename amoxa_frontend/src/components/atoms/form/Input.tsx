import type { InputHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';
import { ClassNames } from '@utils-style/cn.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
}

export function Input({ label, error, hint, trailing, id, className, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={ClassNames.merge(
            'h-11 w-full rounded-lg border border-input bg-card px-4 text-base text-foreground transition-colors duration-200 placeholder:text-muted-foreground focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            error && 'border-destructive',
            trailing ? 'pr-12' : null,
            className,
          )}
          {...rest}
        />
        {trailing ? <div className="absolute inset-y-0 right-0 flex items-center pr-1">{trailing}</div> : null}
      </div>
      {hint ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
