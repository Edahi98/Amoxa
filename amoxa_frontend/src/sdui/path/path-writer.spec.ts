import { PathTokenizer } from '@sdui-path/path-tokenizer';
import { PathResolver } from '@sdui-path/path-resolver';
import { PathWriter } from '@sdui-path/path-writer';

describe('PathWriter', () => {
  const writer = new PathWriter(new PathTokenizer());
  const resolver = new PathResolver(new PathTokenizer());

  it('escribe una ruta anidada sin mutar el origen', () => {
    const source = { programa: { periodo: '', otro: 1 } };
    const next = writer.set(source, 'programa.periodo', '2026');

    expect(next).toEqual({ programa: { periodo: '2026', otro: 1 } });
    expect(source.programa.periodo).toBe('');
    expect(next).not.toBe(source);
    expect(next.programa).not.toBe(source.programa);
  });

  it('comparte las ramas que no cambian', () => {
    const source = { a: { x: 1 }, b: { y: 2 } };
    const next = writer.set(source, 'a.x', 5);
    expect(next.b).toBe(source.b);
  });

  it('usa la misma notación que el tokenizer, incluidos corchetes no numéricos', () => {
    const next = writer.set({}, 'respuestas[q12].resultado', 'NC');
    expect(next).toEqual({ respuestas: { q12: { resultado: 'NC' } } });
    expect(resolver.resolve(next, 'respuestas[q12].resultado')).toBe('NC');
  });

  it('crea arreglos cuando el token es un índice y objetos en otro caso', () => {
    const next = writer.set({}, 'lista[1].nombre', 'b');
    expect(Array.isArray((next as { lista: unknown }).lista)).toBe(true);
    expect(resolver.resolve(next, 'lista[1].nombre')).toBe('b');
    expect(resolver.resolve(next, 'lista[0]')).toBeUndefined();
  });

  it('copia arreglos existentes al escribir un índice', () => {
    const source = { lista: ['a', 'b'] };
    const next = writer.set(source, 'lista[1]', 'z');
    expect(next.lista).toEqual(['a', 'z']);
    expect(source.lista).toEqual(['a', 'b']);
  });

  it('reemplaza valores escalares intermedios por contenedores', () => {
    const next = writer.set({ a: 5 } as Record<string, unknown>, 'a.b', 1);
    expect(next).toEqual({ a: { b: 1 } });
  });

  it('con ruta vacía devuelve el valor', () => {
    expect(writer.set({ a: 1 }, '', 7)).toBe(7);
  });
});
