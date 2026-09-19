import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DateInput } from '@atoms-form/DateInput.js';
import { Input } from '@atoms-form/Input.js';
import { NumberInput } from '@atoms-form/NumberInput.js';
import { RadioGroup } from '@atoms-form/RadioGroup.js';
import { Select } from '@atoms-form/Select.js';
import { Textarea } from '@atoms-form/Textarea.js';
import { Toggle } from '@atoms-form/Toggle.js';

const noop = () => undefined;

describe('atoms/form', () => {
  it('Textarea enlaza label con control, requerido y error con role alert', () => {
    const html = renderToStaticMarkup(
      createElement(Textarea, {
        id: 't',
        label: 'Notas',
        value: 'a',
        onValueChange: noop,
        required: true,
        error: 'Datos no validos',
        hint: 'Ayuda',
      }),
    );
    expect(html).toContain('for="t"');
    expect(html).toContain('id="t"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="t-hint t-error"');
    expect(html).toContain('required');
    expect(html).toContain('*');
  });

  it('Textarea sin error ni pista no expone aria-describedby y admite disabled', () => {
    const html = renderToStaticMarkup(createElement(Textarea, { id: 't', label: 'N', value: '', onValueChange: noop, disabled: true }));
    expect(html).not.toContain('aria-describedby');
    expect(html).not.toContain('role="alert"');
    expect(html).toContain('disabled');
  });

  it('NumberInput muestra unidad, límites y valor nulo', () => {
    const html = renderToStaticMarkup(
      createElement(NumberInput, { id: 'n', label: 'Cantidad', value: null, onValueChange: noop, min: 0, max: 10, step: 0.5, unit: 'kg' }),
    );
    expect(html).toContain('type="number"');
    expect(html).toContain('min="0"');
    expect(html).toContain('max="10"');
    expect(html).toContain('kg');
    const filled = renderToStaticMarkup(createElement(NumberInput, { id: 'n', label: 'C', value: 4, onValueChange: noop, error: 'x' }));
    expect(filled).toContain('value="4"');
    expect(filled).toContain('role="alert"');
  });

  it('DateInput usa type date con min y max', () => {
    const html = renderToStaticMarkup(
      createElement(DateInput, { id: 'd', label: 'Fecha', value: '2026-09-18', onValueChange: noop, min: '2026-01-01', max: '2026-12-31' }),
    );
    expect(html).toContain('type="date"');
    expect(html).toContain('value="2026-09-18"');
    expect(html).toContain('min="2026-01-01"');
  });

  it('Select muestra placeholder y motivo de opciones deshabilitadas', () => {
    const html = renderToStaticMarkup(
      createElement(Select, {
        id: 's',
        label: 'Auditor',
        value: '',
        onValueChange: noop,
        placeholder: 'Selecciona',
        options: [
          { value: 'a', label: 'Ana' },
          { value: 'b', label: 'Beto', disabled: true, disabledReason: 'Conflicto de interés' },
        ],
      }),
    );
    expect(html).toContain('<select');
    expect(html).toContain('Selecciona');
    expect(html).toContain('Beto — Conflicto de interés');
    expect(html).toContain('disabled');
  });

  it('Select sin opciones renderiza', () => {
    expect(renderToStaticMarkup(createElement(Select, { label: 'S', value: '', onValueChange: noop, options: [] }))).toContain('<select');
  });

  it('Toggle expone role switch y aria-checked', () => {
    const on = renderToStaticMarkup(createElement(Toggle, { id: 'g', label: 'Activo', value: true, onValueChange: noop }));
    expect(on).toContain('role="switch"');
    expect(on).toContain('aria-checked="true"');
    expect(on).toContain('for="g"');
    const off = renderToStaticMarkup(
      createElement(Toggle, { id: 'g', label: 'Activo', value: false, onValueChange: noop, error: 'e', disabled: true }),
    );
    expect(off).toContain('aria-checked="false"');
    expect(off).toContain('role="alert"');
  });

  it('RadioGroup expone radiogroup, radios nativos y motivo deshabilitado', () => {
    const html = renderToStaticMarkup(
      createElement(RadioGroup, {
        id: 'r',
        label: 'Método',
        value: 'a',
        onValueChange: noop,
        required: true,
        options: [
          { value: 'a', label: 'In situ' },
          { value: 'b', label: 'Remoto', disabled: true, disabledReason: 'No disponible' },
        ],
      }),
    );
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-labelledby="r-label"');
    expect(html.match(/type="radio"/g)).toHaveLength(2);
    expect(html).toContain('checked');
    expect(html).toContain('No disponible');
  });

  it('RadioGroup segmentado renderiza vacío', () => {
    const html = renderToStaticMarkup(
      createElement(RadioGroup, { label: 'x', value: '', onValueChange: noop, options: [], variant: 'segmented', direction: 'row' }),
    );
    expect(html).toContain('role="radiogroup"');
  });

  it('Input existente conserva su API de eventos DOM', () => {
    const html = renderToStaticMarkup(createElement(Input, { label: 'Correo', id: 'i', error: 'Datos no validos', readOnly: true, value: '' }));
    expect(html).toContain('for="i"');
    expect(html).toContain('role="alert"');
  });
});
