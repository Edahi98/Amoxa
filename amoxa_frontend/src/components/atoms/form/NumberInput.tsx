import { FormField } from '@atoms-form/FormField.js';
import { useFieldIds } from '@hooks/useFieldIds.js';
import { FieldStyles } from '@utils-style/FieldStyles.js';

export interface NumberInputProps {
  label: string;
  value: number | null;
  onValueChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
}

export function NumberInput({
  label,
  value,
  onValueChange,
  min,
  max,
  step,
  unit,
  placeholder,
  hint,
  error,
  required,
  disabled,
  name,
  id,
  className,
}: NumberInputProps) {
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
        <input
          id={controlId}
          name={name}
          type="number"
          inputMode="decimal"
          value={value ?? ''}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => {
            const raw = event.target.value;
            onValueChange(raw === '' ? null : Number(raw));
          }}
          className={FieldStyles.control(Boolean(error), unit ? 'h-11 pr-14 tabular-nums' : 'h-11 tabular-nums')}
        />
        {unit ? (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </div>
    </FormField>
  );
}
