import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MultiSelect } from '@molecules-form/MultiSelect.js';
import { OptionPicker } from '@molecules-form/OptionPicker.js';

const noop = () => undefined;

const options = [
  { value: 'a', label: 'Ana Pérez', description: 'Auditora líder' },
  { value: 'b', label: 'Beto Ruiz', disabled: true, disabledReason: 'Conflicto de interés' },
  { value: 'c', label: 'Carla Soto' },
];

describe('molecules/form', () => {
  it('OptionPicker single expone combobox, label enlazado y muestra la etiqueta seleccionada', () => {
    const html = renderToStaticMarkup(
      createElement(OptionPicker, { id: 'p', label: 'Auditor', options, value: 'a', onValueChange: noop, required: true }),
    );
    expect(html).toContain('role="combobox"');
    expect(html).toContain('for="p"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('value="Ana Pérez"');
    expect(html).not.toContain('role="listbox"');
  });

  it('OptionPicker múltiple muestra chips con botón quitar', () => {
    const html = renderToStaticMarkup(
      createElement(OptionPicker, { id: 'p', label: 'Equipo', options, value: ['a', 'c'], onValueChange: noop, multiple: true }),
    );
    expect(html).toContain('aria-label="Seleccionados"');
    expect(html).toContain('aria-label="Quitar Ana Pérez"');
    expect(html).toContain('aria-label="Quitar Carla Soto"');
  });

  it('OptionPicker con error, deshabilitado y sin opciones renderiza', () => {
    const html = renderToStaticMarkup(
      createElement(OptionPicker, { id: 'p', label: 'X', options: [], value: '', onValueChange: noop, error: 'Datos no validos', disabled: true, searchable: false }),
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('disabled');
    expect(html).toContain('readOnly');
  });

  it('OptionPicker con name genera inputs ocultos por cada valor', () => {
    const html = renderToStaticMarkup(
      createElement(OptionPicker, { label: 'X', options, value: ['a', 'c'], onValueChange: noop, multiple: true, name: 'equipo' }),
    );
    expect(html.match(/type="hidden"/g)).toHaveLength(2);
  });

  it('MultiSelect delega en OptionPicker múltiple', () => {
    const html = renderToStaticMarkup(createElement(MultiSelect, { id: 'm', label: 'Procesos', options, value: ['c'], onValueChange: noop }));
    expect(html).toContain('role="combobox"');
    expect(html).toContain('Quitar Carla Soto');
  });
});
