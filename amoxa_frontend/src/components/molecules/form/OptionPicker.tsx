import { useEffect, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { CaretDown, Check, X } from '@phosphor-icons/react';
import { FormField } from '@atoms-form/FormField.js';
import { useFieldIds } from '@hooks/useFieldIds.js';
import { KeyboardNav } from '@utils-interaction/KeyboardNav.js';
import { OptionFilter } from '@utils-interaction/OptionFilter.js';
import { ClassNames } from '@utils-style/cn.js';
import { FieldStyles } from '@utils-style/FieldStyles.js';

export interface PickerOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface OptionPickerProps {
  label: string;
  options: PickerOption[];
  value: string | string[];
  onValueChange: (value: string | string[]) => void;
  multiple?: boolean;
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

export function OptionPicker({
  label,
  options,
  value,
  onValueChange,
  multiple = false,
  placeholder,
  searchable = true,
  hint,
  error,
  required,
  disabled,
  name,
  id,
  className,
}: OptionPickerProps) {
  const { controlId, hintId, errorId, describedBy } = useFieldIds(id, Boolean(hint), Boolean(error));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const listboxId = `${controlId}-listbox`;
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const visible = OptionFilter.apply(options, searchable ? query : '');
  const selectedOptions = selected.map((item) => options.find((option) => option.value === item) ?? { value: item, label: item });
  const singleLabel = !multiple && selectedOptions[0] ? selectedOptions[0].label : '';
  const inputValue = searchable && open ? query : singleLabel;
  const activeOptionId = open && activeIndex >= 0 && activeIndex < visible.length ? `${controlId}-opt-${activeIndex}` : undefined;
  const inputPlaceholder = multiple ? (selected.length > 0 ? 'Agregar más…' : (placeholder ?? 'Seleccionar…')) : (placeholder ?? 'Seleccionar…');

  useEffect(() => {
    if (activeOptionId) {
      document.getElementById(activeOptionId)?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeOptionId]);

  const close = () => {
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);
  };

  const openList = () => {
    if (disabled) {
      return;
    }
    setOpen(true);
    if (activeIndex < 0) {
      setActiveIndex(0);
    }
  };

  const toggleOption = (option: PickerOption) => {
    if (option.disabled || disabled) {
      return;
    }
    if (multiple) {
      const next = selected.includes(option.value)
        ? selected.filter((item) => item !== option.value)
        : [...selected, option.value];
      onValueChange(next);
      return;
    }
    onValueChange(option.value);
    close();
  };

  const removeValue = (target: string) => {
    if (!disabled) {
      onValueChange(selected.filter((item) => item !== target));
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      const target = KeyboardNav.next(event.key, activeIndex, visible.length, 'vertical');
      if (target !== null) {
        setActiveIndex(target);
      }
      return;
    }
    if (event.key === 'Enter') {
      if (open && activeIndex >= 0 && visible[activeIndex]) {
        event.preventDefault();
        toggleOption(visible[activeIndex]);
      } else if (!open) {
        event.preventDefault();
        openList();
      }
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key === 'Backspace' && multiple && query === '' && selected.length > 0) {
      removeValue(selected[selected.length - 1]);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      close();
    }
  };

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
      <div onBlur={handleBlur} className="flex min-w-0 flex-col gap-2">
        {multiple && selectedOptions.length > 0 ? (
          <ul aria-label="Seleccionados" className="m-0 flex list-none flex-wrap gap-2 p-0">
            {selectedOptions.map((option) => (
              <li
                key={option.value}
                className="inline-flex min-h-9 max-w-full items-center gap-1 rounded-full bg-primary-muted py-1 pl-3 pr-1 text-sm font-medium text-on-primary-muted ring-1 ring-inset ring-on-primary-muted/25"
              >
                <span className="min-w-0 truncate">{option.label}</span>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Quitar ${option.label}`}
                  onClick={() => removeValue(option.value)}
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-primary/15 focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X size={14} weight="bold" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="relative min-w-0">
          <input
            id={controlId}
            type="text"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listboxId : undefined}
            aria-autocomplete={searchable ? 'list' : 'none'}
            aria-activedescendant={activeOptionId}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            aria-required={required ? true : undefined}
            autoComplete="off"
            readOnly={!searchable}
            disabled={disabled}
            value={inputValue}
            placeholder={inputPlaceholder}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActiveIndex(0);
            }}
            onClick={() => (open ? undefined : openList())}
            onKeyDown={handleKeyDown}
            className={FieldStyles.control(Boolean(error), 'h-11 pr-10')}
          />
          <CaretDown
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          {open ? (
            <ul
              id={listboxId}
              role="listbox"
              aria-label={label}
              aria-multiselectable={multiple || undefined}
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-[0_8px_24px_-6px_rgb(15_23_42/0.22)]"
            >
              {visible.length === 0 ? (
                <li role="presentation" className="px-3 py-3 text-sm text-muted-foreground">
                  Sin resultados
                </li>
              ) : (
                visible.map((option, index) => {
                  const isSelected = selected.includes(option.value);
                  return (
                    <li
                      key={option.value}
                      id={`${controlId}-opt-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={option.disabled || undefined}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => toggleOption(option)}
                      className={ClassNames.merge(
                        'flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm',
                        option.disabled ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer text-foreground',
                        index === activeIndex && 'bg-muted',
                      )}
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className={ClassNames.merge('min-w-0', isSelected && 'font-semibold', option.disabled && 'line-through')}>
                          {option.label}
                        </span>
                        {option.description ? <span className="text-xs text-muted-foreground">{option.description}</span> : null}
                        {option.disabled && option.disabledReason ? (
                          <span className="text-xs font-medium text-warning">{option.disabledReason}</span>
                        ) : null}
                      </span>
                      <Check
                        size={16}
                        weight="bold"
                        aria-hidden="true"
                        className={ClassNames.merge('shrink-0 text-primary', !isSelected && 'invisible')}
                      />
                    </li>
                  );
                })
              )}
            </ul>
          ) : null}
        </div>
        {name
          ? selected.map((item) => <input key={item} type="hidden" name={name} value={item} />)
          : null}
      </div>
    </FormField>
  );
}
