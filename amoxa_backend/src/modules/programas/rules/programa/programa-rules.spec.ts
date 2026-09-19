import { FrequencySuggester } from '@programas-rules/frequency-suggester.js';
import { ProgramaCalendar } from '@programas-rules-programa/programa-calendar.js';
import { ProgramaCompleteness } from '@programas-rules-programa/programa-completeness.js';
import { ProgramaStatus } from '@programas-rules-programa/programa-status.js';
import { PriorityScorer, type ProcessSignal } from '@programas-rules/priority-scorer.js';

const signal = (overrides: Partial<ProcessSignal>): ProcessSignal => ({
  id: 'p',
  nombre: 'Proceso',
  importancia: 'media',
  nivelRiesgo: 1,
  cambiosRecientes: false,
  incumplimientosPrevios: 0,
  ...overrides,
});

describe('PriorityScorer', () => {
  it('pondera importancia, riesgo, cambios recientes e incumplimientos previos', () => {
    expect(PriorityScorer.score(signal({ importancia: 'alta', nivelRiesgo: 3, cambiosRecientes: true, incumplimientosPrevios: 2 }))).toBe(
      30 + 15 + 15 + 20,
    );
    expect(PriorityScorer.score(signal({ importancia: 'baja', nivelRiesgo: 0 }))).toBe(10);
  });

  it('ordena de mayor a menor puntaje y desempata por nombre', () => {
    const ranking = PriorityScorer.rank([
      signal({ id: 'b', nombre: 'Bodega', importancia: 'baja' }),
      signal({ id: 'c', nombre: 'Compras', importancia: 'alta' }),
      signal({ id: 'a', nombre: 'Almacén', importancia: 'baja' }),
    ]);

    expect(ranking.map((entry) => entry.id)).toEqual(['c', 'a', 'b']);
  });

  it('detecta si la selección se aparta de la sugerencia', () => {
    const ranking = PriorityScorer.rank([
      signal({ id: 'a', nombre: 'A', importancia: 'alta' }),
      signal({ id: 'b', nombre: 'B', importancia: 'media' }),
      signal({ id: 'c', nombre: 'C', importancia: 'baja' }),
    ]);

    expect(PriorityScorer.isModified(['a', 'b'], ranking)).toBe(false);
    expect(PriorityScorer.isModified(['b', 'a'], ranking)).toBe(true);
    expect(PriorityScorer.isModified(['a', 'c'], ranking)).toBe(true);
    expect(PriorityScorer.isModified([], ranking)).toBe(false);
  });
});

describe('FrequencySuggester', () => {
  it('sugiere frecuencia semestral cuando hay procesos críticos y anual en otro caso', () => {
    expect(FrequencySuggester.suggest(PriorityScorer.rank([signal({ importancia: 'alta', nivelRiesgo: 5, cambiosRecientes: true })]))).toBe('Semestral');
    expect(FrequencySuggester.suggest(PriorityScorer.rank([signal({ incumplimientosPrevios: 2, importancia: 'baja', nivelRiesgo: 0 })]))).toBe('Semestral');
    expect(FrequencySuggester.suggest(PriorityScorer.rank([signal({ importancia: 'baja', nivelRiesgo: 1 })]))).toBe('Anual');
    expect(FrequencySuggester.suggest([])).toBe('Anual');
  });
});

describe('ProgramaCompleteness', () => {
  const complete = {
    periodo: '2026',
    objetivos: 'Verificar el SGC',
    riesgosOportunidades: 'Riesgo de proveedores',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
  };

  it('acepta un programa completo', () => {
    expect(ProgramaCompleteness.missing(complete)).toEqual([]);
  });

  it('lista lo que falta y valida el orden de las fechas', () => {
    expect(ProgramaCompleteness.missing({ ...complete, objetivos: '  ', fechaFin: null })).toEqual(['objetivos', 'fin del calendario']);
    expect(ProgramaCompleteness.missing({ ...complete, fechaFin: '2025-12-31' })).toEqual(['fin del calendario posterior al inicio']);
  });
});

describe('ProgramaStatus', () => {
  it('define qué estados permiten editar, enviar, decidir y ver por la dirección', () => {
    expect(ProgramaStatus.canEdit('borrador')).toBe(true);
    expect(ProgramaStatus.canEdit('devuelto')).toBe(true);
    expect(ProgramaStatus.canEdit('pendiente_aprobacion')).toBe(false);
    expect(ProgramaStatus.canSend('aprobado')).toBe(false);
    expect(ProgramaStatus.canDecide('pendiente_aprobacion')).toBe(true);
    expect(ProgramaStatus.canDecide('borrador')).toBe(false);
    expect(ProgramaStatus.visibleToDireccion('borrador')).toBe(false);
    expect(ProgramaStatus.visibleToDireccion('devuelto')).toBe(true);
    expect(ProgramaStatus.label('pendiente_aprobacion')).toBe('Pendiente de aprobación');
  });
});

describe('ProgramaCalendar', () => {
  it('arma eventos de inicio, fin y auditorías ordenados por fecha', () => {
    const events = ProgramaCalendar.events(
      { id: 'p1', periodo: '2026', fechaInicio: '2026-01-01', fechaFin: '2026-12-31' },
      [
        { id: 'a2', fechaPlan: '2026-09-10', estado: 'planificada', objetivos: null },
        { id: 'a1', fechaPlan: '2026-03-05', estado: 'cerrada', objetivos: 'Auditar compras' },
        { id: 'a3', fechaPlan: null, estado: 'planificada', objetivos: null },
      ],
    );

    expect(events.map((event) => event.date)).toEqual(['2026-01-01', '2026-03-05', '2026-09-10', '2026-12-31']);
    expect(events[1]).toMatchObject({ title: 'Auditar compras', tone: 'success', status: 'cerrada' });
    expect(events[2].title).toBe('Auditoría');
  });
});
