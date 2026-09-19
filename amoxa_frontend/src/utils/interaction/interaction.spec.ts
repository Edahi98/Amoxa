import { KeyboardNav } from '@utils-interaction/KeyboardNav.js';
import { OptionFilter } from '@utils-interaction/OptionFilter.js';

describe('KeyboardNav', () => {
  it('avanza y retrocede con envoltura en horizontal', () => {
    expect(KeyboardNav.next('ArrowRight', 2, 3, 'horizontal')).toBe(0);
    expect(KeyboardNav.next('ArrowLeft', 0, 3, 'horizontal')).toBe(2);
    expect(KeyboardNav.next('ArrowDown', 0, 3, 'horizontal')).toBeNull();
  });

  it('respeta orientación vertical y ambas', () => {
    expect(KeyboardNav.next('ArrowDown', 0, 3, 'vertical')).toBe(1);
    expect(KeyboardNav.next('ArrowUp', 0, 3, 'vertical')).toBe(2);
    expect(KeyboardNav.next('ArrowRight', 0, 3, 'vertical')).toBeNull();
    expect(KeyboardNav.next('ArrowRight', 0, 3)).toBe(1);
    expect(KeyboardNav.next('ArrowUp', 1, 3)).toBe(0);
  });

  it('soporta Home, End, teclas ajenas y lista vacía', () => {
    expect(KeyboardNav.next('Home', 2, 5)).toBe(0);
    expect(KeyboardNav.next('End', 0, 5)).toBe(4);
    expect(KeyboardNav.next('a', 0, 5)).toBeNull();
    expect(KeyboardNav.next('ArrowDown', 0, 0)).toBeNull();
  });
});

describe('OptionFilter', () => {
  const options = [
    { label: 'José Pérez', description: 'Auditor líder' },
    { label: 'Carla Soto' },
  ];

  it('normaliza acentos y mayúsculas', () => {
    expect(OptionFilter.normalize('  JOSÉ ')).toBe('jose');
  });

  it('filtra por etiqueta y descripción sin distinguir acentos', () => {
    expect(OptionFilter.apply(options, 'jose')).toHaveLength(1);
    expect(OptionFilter.apply(options, 'lider')).toHaveLength(1);
    expect(OptionFilter.apply(options, 'zzz')).toHaveLength(0);
    expect(OptionFilter.apply(options, '')).toHaveLength(2);
  });
});
