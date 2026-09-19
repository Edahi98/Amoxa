import type { ReactNode } from 'react';
import { Input } from '@atoms-form/Input.js';
import { Textarea } from '@atoms-form/Textarea.js';
import { NumberInput } from '@atoms-form/NumberInput.js';
import { DateInput } from '@atoms-form/DateInput.js';
import { Select } from '@atoms-form/Select.js';
import { Toggle } from '@atoms-form/Toggle.js';
import { RadioGroup, type RadioDirection, type RadioVariant } from '@atoms-form/RadioGroup.js';
import { MultiSelect } from '@molecules-form/MultiSelect.js';
import { OptionPicker } from '@molecules-form/OptionPicker.js';
import { PropReader } from '@sdui-registry-adapters/prop-reader';
import type { RenderContext } from '@sdui-registry/render-context';

export class FormMappers {
  private static readonly INPUT_TYPES = ['text', 'email', 'tel', 'url', 'search'] as const;
  private static readonly DIRECTIONS: readonly RadioDirection[] = ['column', 'row'];
  private static readonly VARIANTS: readonly RadioVariant[] = ['list', 'segmented'];

  public static textInput(ctx: RenderContext): ReactNode {
    const label = PropReader.string(ctx.props, 'label') ?? ctx.node.id;
    return (
      <Input
        id={ctx.node.id}
        name={PropReader.string(ctx.props, 'name') ?? ctx.node.id}
        type={PropReader.oneOf(ctx.props, 'type', FormMappers.INPUT_TYPES) ?? 'text'}
        label={ctx.required ? `${label} *` : label}
        value={FormMappers.text(ctx.value)}
        placeholder={PropReader.string(ctx.props, 'placeholder')}
        required={ctx.required || undefined}
        disabled={ctx.disabled}
        error={ctx.error}
        onChange={(event) => ctx.setValue(event.target.value, 'typing')}
      />
    );
  }

  public static textarea(ctx: RenderContext): ReactNode {
    return (
      <Textarea
        {...FormMappers.base(ctx)}
        value={FormMappers.text(ctx.value)}
        rows={PropReader.number(ctx.props, 'rows')}
        placeholder={PropReader.string(ctx.props, 'placeholder')}
        onValueChange={(next) => ctx.setValue(next, 'typing')}
      />
    );
  }

  public static numberInput(ctx: RenderContext): ReactNode {
    return (
      <NumberInput
        {...FormMappers.base(ctx)}
        value={FormMappers.number(ctx.value)}
        min={PropReader.number(ctx.props, 'min')}
        max={PropReader.number(ctx.props, 'max')}
        step={PropReader.number(ctx.props, 'step')}
        unit={PropReader.string(ctx.props, 'unit')}
        placeholder={PropReader.string(ctx.props, 'placeholder')}
        onValueChange={(next) => ctx.setValue(next, 'typing')}
      />
    );
  }

  public static dateInput(ctx: RenderContext): ReactNode {
    return (
      <DateInput
        {...FormMappers.base(ctx)}
        value={FormMappers.text(ctx.value)}
        min={PropReader.string(ctx.props, 'min')}
        max={PropReader.string(ctx.props, 'max')}
        onValueChange={(next) => ctx.setValue(next)}
      />
    );
  }

  public static select(ctx: RenderContext): ReactNode {
    return (
      <Select
        {...FormMappers.base(ctx)}
        value={FormMappers.text(ctx.value)}
        options={PropReader.options(ctx.props['options'])}
        placeholder={PropReader.string(ctx.props, 'placeholder')}
        onValueChange={(next) => ctx.setValue(next)}
      />
    );
  }

  public static multiselect(ctx: RenderContext): ReactNode {
    return (
      <MultiSelect
        {...FormMappers.base(ctx)}
        value={PropReader.stringList(ctx.value)}
        options={PropReader.options(ctx.props['options'])}
        placeholder={PropReader.string(ctx.props, 'placeholder')}
        searchable={PropReader.boolean(ctx.props, 'searchable')}
        onValueChange={(next) => ctx.setValue(next)}
      />
    );
  }

  public static toggle(ctx: RenderContext): ReactNode {
    return <Toggle {...FormMappers.base(ctx)} value={ctx.value === true} onValueChange={(next) => ctx.setValue(next)} />;
  }

  public static radioGroup(ctx: RenderContext): ReactNode {
    return (
      <RadioGroup
        {...FormMappers.base(ctx)}
        value={FormMappers.text(ctx.value)}
        options={PropReader.options(ctx.props['options'])}
        direction={PropReader.oneOf(ctx.props, 'direction', FormMappers.DIRECTIONS)}
        variant={PropReader.oneOf(ctx.props, 'variant', FormMappers.VARIANTS)}
        onValueChange={(next) => ctx.setValue(next)}
      />
    );
  }

  public static picker(ctx: RenderContext): ReactNode {
    const multiple = PropReader.boolean(ctx.props, 'multiple') === true;
    return (
      <OptionPicker
        {...FormMappers.base(ctx)}
        multiple={multiple}
        value={multiple ? PropReader.stringList(ctx.value) : FormMappers.text(ctx.value)}
        options={PropReader.options(ctx.props['options'])}
        placeholder={PropReader.string(ctx.props, 'placeholder')}
        searchable={PropReader.boolean(ctx.props, 'searchable')}
        onValueChange={(next) => ctx.setValue(next)}
      />
    );
  }

  private static base(ctx: RenderContext) {
    return {
      id: ctx.node.id,
      name: PropReader.string(ctx.props, 'name') ?? ctx.node.id,
      label: PropReader.string(ctx.props, 'label') ?? ctx.node.id,
      hint: PropReader.string(ctx.props, 'hint'),
      required: ctx.required || undefined,
      disabled: ctx.disabled,
      error: ctx.error,
    };
  }

  private static text(value: unknown): string {
    return PropReader.scalarText(value) ?? '';
  }

  private static number(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
    return null;
  }
}
