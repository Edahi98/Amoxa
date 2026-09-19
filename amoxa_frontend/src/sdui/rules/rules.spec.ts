import { SduiFixtures } from '@sdui-testing/sdui-fixtures';
import { RuleEvaluator } from '@sdui-rules/rule-evaluator';
import { StateMachineGuard } from '@sdui-rules/state-machine-guard';
import { ScreenContextFactory } from '@sdui-runtime-screen/screen-context-factory';

describe('RuleEvaluator', () => {
  const screen = SduiFixtures.screen();
  const evaluator = new RuleEvaluator(screen.rules);

  it('una regla está violada cuando su when evalúa true', () => {
    const violated = evaluator.violations(screen.context).map((rule) => rule.id);
    expect(violated).toEqual(['PERIODO_VACIO', 'AVANCE_BAJO', 'ESTADO_BORRADOR']);
  });

  it('filtra por ids y por severidad', () => {
    expect(evaluator.violationsById(['AVANCE_BAJO'], screen.context).map((rule) => rule.id)).toEqual(['AVANCE_BAJO']);
    expect(evaluator.violationsBySeverity('block', screen.context).map((rule) => rule.id)).toEqual(['PERIODO_VACIO']);
    expect(evaluator.violationsBySeverity('info', screen.context)).toHaveLength(1);
  });

  it('las reglas dejan de estar violadas al corregir los datos', () => {
    const fixed = ScreenContextFactory.withData(screen.context, { programa: { periodo: '2026' }, avance: 80 });
    expect(evaluator.violations(fixed).map((rule) => rule.id)).toEqual(['ESTADO_BORRADOR']);
    expect(evaluator.isViolated('PERIODO_VACIO', fixed)).toBe(false);
  });

  it('blocking solo considera severidad block y devuelve mensajes', () => {
    expect(evaluator.blocking(['PERIODO_VACIO', 'AVANCE_BAJO'], screen.context).map((rule) => rule.id)).toEqual(['PERIODO_VACIO']);
    expect(evaluator.blocking(['AVANCE_BAJO'], screen.context)).toEqual([]);
    expect(evaluator.messages(['PERIODO_VACIO'], screen.context)).toEqual(['Indique el periodo del programa.']);
  });

  it('ignora ids desconocidos y funciona sin reglas', () => {
    expect(evaluator.violationsById(['NO_EXISTE'], screen.context)).toEqual([]);
    expect(new RuleEvaluator(undefined).violations(screen.context)).toEqual([]);
  });
});

describe('StateMachineGuard', () => {
  const screen = SduiFixtures.screen();
  const evaluator = new RuleEvaluator(screen.rules);
  const guard = new StateMachineGuard(screen.stateMachine, evaluator);
  const complete = ScreenContextFactory.withData(screen.context, { programa: { periodo: '2026' } });

  it('las acciones fuera de la máquina no se restringen', () => {
    expect(guard.check('refrescar', screen.context)).toEqual({ allowed: true });
    expect(new StateMachineGuard(undefined, evaluator).isAllowed('guardar', screen.context)).toBe(true);
  });

  it('niega una acción cuando sus requires están violados', () => {
    const decision = guard.check('guardar', screen.context);
    expect(decision.allowed).toBe(false);
    expect(decision.denial).toBe('requires');
    expect(decision.message).toBe('Indique el periodo del programa.');
  });

  it('permite la acción cuando el rol es admitido y los requires se cumplen', () => {
    expect(guard.isAllowed('guardar', complete)).toBe(true);
  });

  it('niega por rol cuando ninguna transición admite al usuario', () => {
    const decision = guard.check('confirmar', complete);
    expect(decision.allowed).toBe(false);
    expect(decision.denial).toBe('role');
  });

  it('una transición sin roles no restringe por rol', () => {
    const open = SduiFixtures.screen((raw) => {
      (raw['state_machine'] as { transitions: unknown[] }).transitions = [{ to: 'x', action: 'confirmar' }];
    });
    const openGuard = new StateMachineGuard(open.stateMachine, new RuleEvaluator(open.rules));
    expect(openGuard.isAllowed('confirmar', open.context)).toBe(true);
  });

  it('basta una transición válida entre varias con la misma acción', () => {
    const multi = SduiFixtures.screen((raw) => {
      (raw['state_machine'] as { transitions: unknown[] }).transitions = [
        { to: 'a', action: 'guardar', roles: ['gestor'], requires: ['PERIODO_VACIO'] },
        { to: 'b', action: 'guardar', roles: ['gestor'] },
      ];
    });
    const multiGuard = new StateMachineGuard(multi.stateMachine, new RuleEvaluator(multi.rules));
    expect(multiGuard.isAllowed('guardar', multi.context)).toBe(true);
  });
});
