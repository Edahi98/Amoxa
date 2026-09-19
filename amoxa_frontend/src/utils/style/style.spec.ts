import { ClassNames } from '@utils-style/cn.js';
import { FieldStyles } from '@utils-style/FieldStyles.js';
import { ToneStyles } from '@utils-style/ToneStyles.js';

describe('ToneStyles', () => {
  it('define estilos, icono y etiqueta para cada tono', () => {
    for (const tone of ToneStyles.TONES) {
      expect(ToneStyles.soft(tone)).toBeTruthy();
      expect(ToneStyles.text(tone)).toBeTruthy();
      expect(ToneStyles.solid(tone)).toBeTruthy();
      expect(ToneStyles.icon(tone)).toBeTruthy();
      expect(ToneStyles.label(tone)).toBeTruthy();
    }
  });

  it('usa solo tokens semánticos, sin colores crudos', () => {
    for (const tone of ToneStyles.TONES) {
      expect(ToneStyles.soft(tone)).not.toMatch(/#[0-9a-f]{3,6}/i);
    }
  });
});

describe('FieldStyles y ClassNames', () => {
  it('cambia el borde según el error y mezcla className', () => {
    expect(FieldStyles.control(true, 'extra')).toContain('border-destructive');
    expect(FieldStyles.control(false)).toContain('border-input');
    expect(FieldStyles.control(false, 'extra')).toContain('extra');
    expect(ClassNames.merge('a', false, null, undefined, 'b')).toBe('a b');
  });
});
