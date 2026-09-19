import { CaretDown } from '@phosphor-icons/react';
import { FormField } from '@atoms-form/FormField.js';
import { useFieldIds } from '@hooks/useFieldIds.js';
import { FieldStyles } from '@utils-style/FieldStyles.js';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface SelectProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
}

export function Select({
  label,
  value,
  onValueChange,
  options,
  placeholder,
  hint,
  error,
  required,
  disabled,
  name,
  id,
  className,
}: SelectProps) {
  const { controlId, hintId, errorId, describedBy } = useFieldIds(id, Boolean(hint), Boolean(error));

  return (
    <FormField
      controlId={controlId}
      hintId={hintId}
      errorId={errorId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <div className="relative">
        <select
          id={controlId}
          name={name}
          value={value}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onValueChange(event.target.value)}
          className={FieldStyles.control(Boolean(error), 'h-11 cursor-pointer appearance-none pr-10')}
        >
          {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.disabled && option.disabledReason ? `${option.label} — ${option.disabledReason}` : option.label}
            </option>
          ))}
        </select>
        <CaretDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </FormField>
  );
}
