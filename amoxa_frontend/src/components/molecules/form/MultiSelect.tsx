import { OptionPicker, type PickerOption } from '@molecules-form/OptionPicker.js';

export interface MultiSelectProps {
  label: string;
  options: PickerOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
}

export function MultiSelect({ onValueChange, ...rest }: MultiSelectProps) {
  return (
    <OptionPicker
      {...rest}
      multiple
      onValueChange={(next) => onValueChange(Array.isArray(next) ? next : next ? [next] : [])}
    />
  );
}
