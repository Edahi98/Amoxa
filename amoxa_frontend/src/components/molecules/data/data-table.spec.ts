import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataTable, DataTableModel, type DataTableColumn } from '@molecules-data/DataTable.js';
import { TableCells } from '@utils-table/TableCells.js';
import { TableSorter } from '@utils-table/TableSorter.js';

const columns: DataTableColumn[] = [
  { key: 'nombre', label: 'Nombre', kind: 'text', sortable: true, tones: {} },
  { key: 'estado', label: 'Estado', kind: 'badge', sortable: false, tones: { Activo: 'success' } },
  { key: 'total', label: 'Total', kind: 'number', sortable: true, tones: {} },
  { key: 'acceso', label: 'Último acceso', kind: 'date', sortable: false, tones: {} },
];

const rows = [
  { id: 'b', nombre: 'Beto', estado: 'Activo', total: 1200, acceso: '2026-01-02T10:00:00.000Z' },
  { id: 'a', nombre: 'Ana', estado: 'Inactivo', total: 5, acceso: null },
];

const render = (props: Partial<Parameters<typeof DataTable>[0]> = {}) =>
  renderToStaticMarkup(createElement(DataTable, { caption: 'Usuarios', columns, rows, ...props }));

describe('DataTable', () => {
  it('es una tabla semántica con leyenda oculta y encabezados de columna', () => {
    const html = render();

    expect(html).toContain('<table');
    expect(html).toContain('<caption class="sr-only">Usuarios</caption>');
    expect(html.match(/scope="col"/g)).toHaveLength(4);
  });

  it('solo las columnas ordenables llevan aria-sort y un botón', () => {
    const html = render();

    expect(html.match(/aria-sort="none"/g)).toHaveLength(2);
    expect(html.match(/<th[^>]*>\s*<button/g)).toHaveLength(2);
  });

  it('alinea y formatea los números con cifras tabulares y muestra una raya en los vacíos', () => {
    const html = render();

    expect(html).toContain('tabular-nums');
    expect(html).toContain('text-right');
    expect(html).toContain('1,200');
    expect(html).toContain(TableCells.EMPTY);
  });

  it('dibuja la insignia con el tono definido para su valor', () => {
    expect(render()).toContain('Activo');
  });

  it('rodea la tabla con desplazamiento horizontal para que no rompa el diseño en móvil', () => {
    expect(render()).toContain('overflow-x-auto');
  });

  it('sin filas muestra el texto vacío en lugar de la tabla', () => {
    const html = render({ rows: [], emptyText: 'No hay usuarios.' });

    expect(html).toContain('No hay usuarios.');
    expect(html).not.toContain('<table');
  });

  it('con acción de fila el primer valor es un botón enfocable', () => {
    const html = render({ onRowPress: () => undefined });

    expect(html).toContain('cursor-pointer');
    expect(html.match(/<td[^>]*>\s*<button/g)).toHaveLength(2);
  });

  it('describe el orden actual para lectores de pantalla', () => {
    expect(DataTableModel.ariaSort(true, 'asc')).toBe('ascending');
    expect(DataTableModel.ariaSort(true, 'desc')).toBe('descending');
    expect(DataTableModel.ariaSort(false, 'asc')).toBe('none');
    expect(DataTableModel.ariaSort(true, null)).toBe('none');
  });

  it('usa el id de la fila o su posición como clave', () => {
    expect(DataTableModel.rowId({ id: 'x' }, 3)).toBe('x');
    expect(DataTableModel.rowId({}, 3)).toBe('3');
  });
});

describe('TableSorter', () => {
  const data = [{ n: 'beto' }, { n: 'Ana' }, { n: '' }, { n: 'álvaro' }];

  it('ordena ascendente sin distinguir mayúsculas ni acentos y deja los vacíos al final', () => {
    expect(TableSorter.sort(data, 'n', 'asc').map((row) => row.n)).toEqual(['álvaro', 'Ana', 'beto', '']);
  });

  it('ordena descendente y conserva el orden original sin dirección', () => {
    expect(TableSorter.sort(data, 'n', 'desc').map((row) => row.n)).toEqual(['beto', 'Ana', 'álvaro', '']);
    expect(TableSorter.sort(data, 'n', null)).toEqual(data);
  });

  it('ordena los números por valor y no como texto', () => {
    expect(TableSorter.sort([{ v: 10 }, { v: 9 }, { v: 100 }], 'v', 'asc').map((row) => row.v)).toEqual([9, 10, 100]);
  });

  it('alterna asc, desc y sin orden', () => {
    expect(TableSorter.next(null)).toBe('asc');
    expect(TableSorter.next('asc')).toBe('desc');
    expect(TableSorter.next('desc')).toBeNull();
  });

  it('no modifica el arreglo original', () => {
    const copy = [...data];
    TableSorter.sort(data, 'n', 'asc');
    expect(data).toEqual(copy);
  });
});
