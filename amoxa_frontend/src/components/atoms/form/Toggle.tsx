import { useFieldIds } from '@hooks/useFieldIds.js';
import { ClassNames } from '@utils-style/cn.js';

export interface ToggleProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
}

export function Toggle({ label, value, onValueChange, hint, error, required, disabled, name, id, className }: ToggleProps) {
  const { controlId, hintId, errorId, describedBy } = useFieldIds(id, Boolean(hint), Boolean(error));

  return (
    <div className={ClassNames.merge('flex min-w-0 flex-col gap-2', className)}>
      <div className="flex min-h-11 items-center gap-3">
        <button
          id={controlId}
          name={name}
          type="button"
          role="switch"
          aria-checked={value}
          aria-required={required ? true : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          onClick={() => onValueChange(!value)}
          className={ClassNames.merge(
            'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            value ? 'border-primary bg-primary' : 'border-input bg-muted',
          )}
        >
          <span
            aria-hidden="true"
            className={ClassNames.merge(
              'block h-5 w-5 rounded-full bg-card shadow-sm ring-1 ring-border transition-transform duration-200 motion-reduce:transition-none',
              value ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>
        <label htmlFor={controlId} className="cursor-pointer text-sm font-medium text-foreground">
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-1 text-destructive">
              *
            </span>
          ) : null}
        </label>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums" aria-hidden="true">
          {value ? 'Sí' : 'No'}
        </span>
      </div>
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
