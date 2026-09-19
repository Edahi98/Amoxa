import { ByteFormatter } from '@utils-format/ByteFormatter.js';
import { DateFormatter } from '@utils-format/DateFormatter.js';
import { NumberFormatter } from '@utils-format/NumberFormatter.js';

describe('ByteFormatter', () => {
  it('formatea unidades con escala de 1024', () => {
    expect(ByteFormatter.format(0)).toBe('0 B');
    expect(ByteFormatter.format(800)).toBe('800 B');
    expect(ByteFormatter.format(1024)).toBe('1.0 KB');
    expect(ByteFormatter.format(2_500_000)).toBe('2.4 MB');
    expect(ByteFormatter.format(5 * 1024 ** 3)).toBe('5.0 GB');
  });

  it('tolera valores inválidos', () => {
    expect(ByteFormatter.format(-1)).toBe('0 B');
    expect(ByteFormatter.format(Number.NaN)).toBe('0 B');
  });
});

describe('NumberFormatter', () => {
  it('usa separadores es-MX y unidad opcional', () => {
    expect(NumberFormatter.format(1234.5)).toBe('1,234.5');
    expect(NumberFormatter.format(3, 'kg')).toBe('3 kg');
    expect(NumberFormatter.format(Number.NaN)).toBe('—');
    expect(NumberFormatter.percent(45.4)).toBe('45 %');
    expect(NumberFormatter.percent(180)).toBe('100 %');
    expect(NumberFormatter.coordinate(19.4326)).toBe('19.43260');
  });
});

describe('DateFormatter', () => {
  it('interpreta fechas ISO sin desfase de zona horaria', () => {
    expect(DateFormatter.parseIso('2026-09-18')?.getUTCDate()).toBe(18);
    expect(DateFormatter.parseIso('basura')).toBeNull();
    expect(DateFormatter.date('2026-09-18')).toContain('2026');
    expect(DateFormatter.date('basura')).toBe('basura');
    expect(DateFormatter.dateTime('nope')).toBe('nope');
  });

  it('arma rangos parciales', () => {
    expect(DateFormatter.range()).toBe('');
    expect(DateFormatter.range('2026-10-01', '2026-10-03')).toContain('–');
    expect(DateFormatter.range('2026-10-01')).toMatch(/^Desde/);
    expect(DateFormatter.range(undefined, '2026-10-03')).toMatch(/^Hasta/);
  });
});
