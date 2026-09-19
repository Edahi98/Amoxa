import type { ReactNode } from 'react';
import { ClassNames } from '@utils-style/cn.js';

export interface FormFieldProps {
  controlId: string;
  hintId: string;
  errorId: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  as?: 'label' | 'text';
  labelId?: string;
  className?: string;
  children: ReactNode;
}

export function FormField({
  controlId,
  hintId,
  errorId,
  label,
  hint,
  error,
  required,
  as = 'label',
  labelId,
  className,
  children,
}: FormFieldProps) {
  const labelContent = (
    <>
      {label}
      {required ? (
        <span aria-hidden="true" className="ml-1 text-destructive">
          *
        </span>
      ) : null}
    </>
  );

  return (
    <div className={ClassNames.merge('flex min-w-0 flex-col gap-2', className)}>
      {as === 'label' ? (
        <label id={labelId} htmlFor={controlId} className="text-sm font-medium text-foreground">
          {labelContent}
        </label>
      ) : (
        <span id={labelId} className="text-sm font-medium text-foreground">
          {labelContent}
        </span>
      )}
      {children}
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
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
