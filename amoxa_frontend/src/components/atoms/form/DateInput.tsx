import { FormField } from '@atoms-form/FormField.js';
import { useFieldIds } from '@hooks/useFieldIds.js';
import { FieldStyles } from '@utils-style/FieldStyles.js';

export interface DateInputProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  min?: string;
  max?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
}

export function DateInput({
  label,
  value,
  onValueChange,
  min,
  max,
  hint,
  error,
  required,
  disabled,
  name,
  id,
  className,
}: DateInputProps) {
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
      <input
        id={controlId}
        name={name}
        type="date"
        value={value}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onValueChange(event.target.value)}
        className={FieldStyles.control(Boolean(error), 'h-11 tabular-nums')}
      />
    </FormField>
  );
}
