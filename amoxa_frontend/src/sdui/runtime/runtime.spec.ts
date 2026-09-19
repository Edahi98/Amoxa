import { SduiFixtures } from '@sdui-testing/sdui-fixtures';
import { RuleEvaluator } from '@sdui-rules/rule-evaluator';
import { ChangeDispatcher } from '@sdui-runtime/change-dispatcher';
import { MediaCaptureFocus } from '@sdui-runtime-focus/media-capture-focus';
import { RulePresentation } from '@sdui-runtime-validation/rule-presentation';
import { ScreenContent } from '@sdui-runtime-screen/screen-content';
import { ScreenContextFactory } from '@sdui-runtime-screen/screen-context-factory';
import { ScreenRoute } from '@sdui-runtime-screen/screen-route';
import { ValidationPresenter } from '@sdui-runtime-validation/validation-presenter';
import { ValueChecks } from '@sdui-runtime-validation/value-checks';
import { ChartDataAdapter } from '@sdui-registry-adapters/chart-data-adapter';
import { PropReader } from '@sdui-registry-adapters/prop-reader';
import { RecordNormalizer } from '@sdui-registry-adapters/record-normalizer';
import { ComponentTraverser } from '@sdui-traversal/component-traverser';

describe('ScreenRoute', () => {
  it('inicio va a /dashboard y el resto a /app/:screenId con la entidad en el query', () => {
    expect(ScreenRoute.pathFor('inicio')).toBe('/dashboard');
    expect(ScreenRoute.pathFor('programa.lista')).toBe('/app/programa.lista');
    expect(ScreenRoute.pathFor('auditoria.plan', { entityId: 'a1', entityType: 'AUDITORIA' })).toBe(
      '/app/auditoria.plan?entityId=a1&entityType=AUDITORIA',
    );
    expect(ScreenRoute.pathFor('x', { entity_id: 7 })).toBe('/app/x?entityId=7');
  });

  it('lee la pantalla y la entidad desde la ubicación', () => {
    expect(ScreenRoute.fromLocation('hallazgo.lista', new URLSearchParams('entityId=h1&entityType=HALLAZGO'))).toEqual({
      screenId: 'hallazgo.lista',
      entityId: 'h1',
      entityType: 'HALLAZGO',
    });
    expect(ScreenRoute.fromLocation(undefined, new URLSearchParams()).screenId).toBe('inicio');
  });
});

describe('ValidationPresenter', () => {
  const screen = SduiFixtures.screen();
  const presenter = new ValidationPresenter(screen, new RuleEvaluator(screen.rules));
  const periodo = new ComponentTraverser().findById(screen.root, 'periodo');

  it('devuelve el mensaje de las reglas violadas de un campo', () => {
    expect(periodo && presenter.errorFor(periodo, '', screen.context)).toBe('Indique el periodo del programa.');
    const fixed = ScreenContextFactory.withData(screen.context, { programa: { periodo: '2026' } });
    expect(periodo && presenter.errorFor(periodo, '2026', fixed)).toBeUndefined();
  });

  it('el resumen omite reglas de campo aún no reveladas pero conserva las globales', () => {
    const hidden = presenter.summary(screen.context, () => false).map((entry) => entry.rule.id);
    expect(hidden).toEqual(['AVANCE_BAJO', 'ESTADO_BORRADOR']);

    const revealed = presenter.summary(screen.context, (id) => id === 'periodo');
    expect(revealed.find((entry) => entry.rule.id === 'PERIODO_VACIO')?.targetId).toBe('periodo');
  });
});

describe('RulePresentation', () => {
  it('agrupa por severidad en el orden block, warn, info', () => {
    const screen = SduiFixtures.screen();
    const summary = new RuleEvaluator(screen.rules).violations(screen.context).map((rule) => ({ rule }));

    const groups = RulePresentation.groups(summary);

    expect(groups.map((group) => group.tone)).toEqual(['danger', 'warning', 'info']);
    expect(groups[0].message).toBe('Corrige este punto antes de continuar.');
  });
});

describe('ChangeDispatcher', () => {
  it('con retraso 0 ejecuta de inmediato y con retraso agrupa llamadas', () => {
    vi.useFakeTimers();
    const dispatcher = new ChangeDispatcher();
    const run = vi.fn();

    dispatcher.schedule('a', 0, run);
    expect(run).toHaveBeenCalledTimes(1);

    dispatcher.schedule('b', 500, run);
    dispatcher.schedule('b', 500, run);
    vi.advanceTimersByTime(499);
    expect(run).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(2);

    dispatcher.schedule('c', 500, run);
    dispatcher.cancelAll();
    vi.advanceTimersByTime(1000);
    expect(run).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe('utilidades del runtime', () => {
  it('MediaCaptureFocus encuentra el primer evidence_capture o el componentId pedido', () => {
    const screen = SduiFixtures.screen();
    expect(MediaCaptureFocus.targetId(screen.root, {})).toBe('evidencia_q1');
    expect(MediaCaptureFocus.targetId(screen.root, { componentId: 'otro' })).toBe('otro');
    expect(MediaCaptureFocus.focus(screen.root, {})).toBe(false);
  });

  it('ScreenContent detecta pantallas vacías', () => {
    const screen = SduiFixtures.screen();
    expect(ScreenContent.isEmpty(screen.root, () => true)).toBe(false);
    expect(ScreenContent.isEmpty(screen.root, () => false)).toBe(true);
  });

  it('ValueChecks.isEmpty', () => {
    expect([ValueChecks.isEmpty(''), ValueChecks.isEmpty(null), ValueChecks.isEmpty([]), ValueChecks.isEmpty(0), ValueChecks.isEmpty('a')]).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
  });
});

describe('adaptadores del registro', () => {
  it('RecordNormalizer convierte claves snake_case a camelCase recursivamente', () => {
    expect(RecordNormalizer.camel({ evidence_count: 2, due_date: { start_at: 'x' }, lista: [{ item_id: 1 }] })).toEqual({
      evidenceCount: 2,
      dueDate: { startAt: 'x' },
      lista: [{ itemId: 1 }],
    });
    expect(RecordNormalizer.record('no es un registro')).toEqual({});
  });

  it('PropReader lee tipos con seguridad y normaliza opciones', () => {
    const props = { a: 'x', n: 3, b: true, tone: 'info' };
    expect(PropReader.string(props, 'a')).toBe('x');
    expect(PropReader.string(props, 'n')).toBeUndefined();
    expect(PropReader.number(props, 'n')).toBe(3);
    expect(PropReader.boolean(props, 'b')).toBe(true);
    expect(PropReader.oneOf(props, 'tone', ['info', 'danger'] as const)).toBe('info');
    expect(PropReader.oneOf(props, 'a', ['info', 'danger'] as const)).toBeUndefined();
    expect(PropReader.options(['a', { value: 'b', label: 'B', description: 'd' }, { nada: 1 }, 5])).toEqual([
      { value: 'a', label: 'a' },
      { value: 'b', label: 'B', description: 'd' },
    ]);
    expect(PropReader.stringList('x')).toEqual(['x']);
    expect(PropReader.stringList([1, 'y'])).toEqual(['y']);
  });

  it('ChartDataAdapter acepta labels/datasets, mapa etiqueta-valor y arreglo de puntos', () => {
    const props = { datasets: [{ label: 'Incumplimientos', data: [] }] };

    expect(ChartDataAdapter.resolve({ labels: ['A'], datasets: [{ label: 'S', data: [1] }] }, props)).toEqual({
      labels: ['A'],
      datasets: [{ label: 'S', data: [1] }],
    });
    expect(ChartDataAdapter.resolve({ Norte: 3, Sur: 5 }, props)).toEqual({
      labels: ['Norte', 'Sur'],
      datasets: [{ label: 'Incumplimientos', data: [3, 5] }],
    });
    expect(ChartDataAdapter.resolve([{ label: 'Norte', value: 3 }, { name: 'Sur', total: '5' }], props).datasets[0].data).toEqual([3, 5]);
    expect(ChartDataAdapter.resolve(undefined, { labels: ['X'], datasets: [{ label: 'S', data: [2] }] }).labels).toEqual(['X']);
    expect(ChartDataAdapter.resolve(undefined, {})).toEqual({ labels: [], datasets: [] });
  });
});
