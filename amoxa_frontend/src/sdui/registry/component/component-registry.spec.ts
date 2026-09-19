import { ComponentRegistry } from '@sdui-registry-component/component-registry';
import { COMPONENT_TYPES } from '@sdui-model/sdui-enums';

describe('ComponentRegistry', () => {
  it('tiene un descriptor para cada tipo de componente del contrato', () => {
    expect(ComponentRegistry.missing()).toEqual([]);
    COMPONENT_TYPES.forEach((type) => {
      const descriptor = ComponentRegistry.get(type);
      expect(descriptor, type).toBeDefined();
      expect(descriptor?.type).toBe(type);
      expect(descriptor?.component.length).toBeGreaterThan(0);
      expect(typeof descriptor?.render).toBe('function');
    });
    expect(ComponentRegistry.types()).toHaveLength(COMPONENT_TYPES.length);
  });

  it('clasifica cada tipo con un kind válido', () => {
    const kinds = new Set(['container', 'display', 'control', 'pressable', 'custom']);
    COMPONENT_TYPES.forEach((type) => expect(kinds.has(ComponentRegistry.kindOf(type) ?? ''), type).toBe(true));
  });

  it('asigna el kind esperado a los tipos representativos', () => {
    expect(ComponentRegistry.kindOf('container')).toBe('container');
    expect(ComponentRegistry.kindOf('tabs')).toBe('container');
    expect(ComponentRegistry.kindOf('text')).toBe('display');
    expect(ComponentRegistry.kindOf('text_input')).toBe('control');
    expect(ComponentRegistry.kindOf('checklist_item')).toBe('control');
    expect(ComponentRegistry.kindOf('button')).toBe('pressable');
    expect(ComponentRegistry.kindOf('finding_card')).toBe('pressable');
    expect(ComponentRegistry.kindOf('gantt')).toBe('custom');
    expect(ComponentRegistry.kindOf('chart')).toBe('custom');
  });

  it('text_input usa el átomo Input y los pickers comparten OptionPicker', () => {
    expect(ComponentRegistry.get('text_input')?.component).toBe('Input');
    expect(ComponentRegistry.get('person_picker')?.component).toBe('OptionPicker');
    expect(ComponentRegistry.get('clause_picker')?.component).toBe('OptionPicker');
  });

  it('un tipo desconocido no tiene descriptor', () => {
    expect(ComponentRegistry.get('no_existe')).toBeUndefined();
    expect(ComponentRegistry.has('no_existe')).toBe(false);
    expect(ComponentRegistry.kindOf('no_existe')).toBeUndefined();
  });
});
