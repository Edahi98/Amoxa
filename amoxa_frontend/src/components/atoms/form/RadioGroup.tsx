import { useId, type ReactNode } from 'react';
import { Check } from '@phosphor-icons/react';
import { FormField } from '@atoms-form/FormField.js';
import { useFieldIds } from '@hooks/useFieldIds.js';
import { ClassNames } from '@utils-style/cn.js';

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  icon?: ReactNode;
}

export type RadioDirection = 'column' | 'row';
export type RadioVariant = 'list' | 'segmented';

export interface RadioGroupProps {
  label: string;
  options: RadioOption[];
  value: string;
  onValueChange: (value: string) => void;
  direction?: RadioDirection;
  variant?: RadioVariant;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
}

export function RadioGroup({
  label,
  options,
  value,
  onValueChange,
  direction = 'column',
  variant = 'list',
  hint,
  error,
  required,
  disabled,
  name,
  id,
  className,
}: RadioGroupProps) {
  const { controlId, hintId, errorId, describedBy } = useFieldIds(id, Boolean(hint), Boolean(error));
  const generatedName = useId();
  const groupName = name ?? generatedName;
  const labelId = `${controlId}-label`;
  const segmented = variant === 'segmented';

  return (
    <FormField
      as="text"
      labelId={labelId}
      controlId={controlId}
      hintId={hintId}
      errorId={errorId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <div
        id={controlId}
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        aria-required={required ? true : undefined}
        aria-invalid={error ? true : undefined}
        className={ClassNames.merge('flex min-w-0 flex-wrap gap-2', direction === 'column' && !segmented && 'flex-col')}
      >
        {options.map((option) => {
          const isDisabled = Boolean(disabled || option.disabled);
          return (
            <label
              key={option.value}
              className={ClassNames.merge(
                'flex min-h-11 min-w-0 items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors duration-200 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring',
                isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted',
                segmented
                  ? 'flex-1 justify-center border-input bg-card text-foreground has-checked:border-primary has-checked:bg-primary-muted has-checked:text-on-primary-muted has-checked:font-semibold'
                  : 'border-transparent text-foreground has-checked:border-input has-checked:bg-muted',
              )}
            >
              <input
                type="radio"
                name={groupName}
                value={option.value}
                checked={value === option.value}
                disabled={isDisabled}
                required={required}
                onChange={() => onValueChange(option.value)}
                className="peer sr-only"
              />
              {segmented ? (
                <>
                  {option.icon}
                  <span className="min-w-0">{option.label}</span>
                  <Check size={16} weight="bold" aria-hidden="true" className="hidden shrink-0 peer-checked:inline" />
                </>
              ) : (
                <>
                  <span
                    aria-hidden="true"
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-input after:h-2.5 after:w-2.5 after:rounded-full after:bg-transparent after:content-[''] peer-checked:border-primary peer-checked:after:bg-primary"
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-2">
                      {option.icon}
                      <span>{option.label}</span>
                    </span>
                    {isDisabled && option.disabledReason ? (
                      <span className="text-xs text-muted-foreground">{option.disabledReason}</span>
                    ) : null}
                  </span>
                </>
              )}
            </label>
          );
        })}
      </div>
    </FormField>
  );
}
