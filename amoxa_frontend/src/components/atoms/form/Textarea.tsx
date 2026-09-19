import { FormField } from '@atoms-form/FormField.js';
import { useFieldIds } from '@hooks/useFieldIds.js';
import { FieldStyles } from '@utils-style/FieldStyles.js';

export interface TextareaProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
}

export function Textarea({
  label,
  value,
  onValueChange,
  rows = 3,
  placeholder,
  hint,
  error,
  required,
  disabled,
  name,
  id,
  className,
}: TextareaProps) {
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
      <textarea
        id={controlId}
        name={name}
        rows={rows}
        value={value}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onValueChange(event.target.value)}
        className={FieldStyles.control(Boolean(error), 'min-h-11 resize-y py-2.5')}
      />
    </FormField>
  );
}
