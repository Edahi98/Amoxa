import { AccionAccess } from '@acciones-rules-accion/accion-access.js';
import type { AccionDetalle } from '@acciones-rules-accion/accion-detalle.types.js';
import { ActionState } from '@acciones-rules-action/action-state.js';
import { ActionTransitions } from '@acciones-rules-action/action-transitions.js';
import { DeadlineCalculator } from '@acciones-rules/deadline-calculator.js';
import { VerifierEligibility } from '@acciones-rules/verifier-eligibility.js';

const NOW = new Date('2026-05-10T15:00:00.000Z');

describe('reglas puras de acciones', () => {
  it('calcula días restantes, vencimiento y tipo de alerta', () => {
    expect(DeadlineCalculator.daysLeft('2026-05-17', NOW)).toBe(7);
    expect(DeadlineCalculator.daysLeft('2026-05-11', NOW)).toBe(1);
    expect(DeadlineCalculator.daysLeft('2026-05-10', NOW)).toBe(0);
    expect(DeadlineCalculator.daysLeft('2026-05-09', NOW)).toBe(-1);
    expect(DeadlineCalculator.daysLeft(null, NOW)).toBeNull();
    expect(DeadlineCalculator.isOverdue('2026-05-09', NOW)).toBe(true);
    expect(DeadlineCalculator.isOverdue('2026-05-10', NOW)).toBe(false);
    expect(DeadlineCalculator.alertFor(7)).toBe('previa_7');
    expect(DeadlineCalculator.alertFor(4)).toBe('previa_7');
    expect(DeadlineCalculator.alertFor(1)).toBe('previa_1');
    expect(DeadlineCalculator.alertFor(0)).toBe('previa_1');
    expect(DeadlineCalculator.alertFor(-1)).toBe('vencida');
    expect(DeadlineCalculator.alertFor(8)).toBeNull();
    expect(DeadlineCalculator.describe(3)).toBe('Faltan 3 día(s)');
    expect(() => DeadlineCalculator.assertNotPast('2026-05-09', NOW)).toThrow();
    expect(() => DeadlineCalculator.assertNotPast('2026-05-10', NOW)).not.toThrow();
  });

  it('resuelve el estado de la acción para la pantalla', () => {
    const base = { fechaCierre: null, verificacionEficacia: 'pendiente' as const, reaperturas: 0 };
    expect(ActionState.resolve({ ...base, estado: 'pendiente' })).toBe('abierta');
    expect(ActionState.resolve({ ...base, estado: 'pendiente', reaperturas: 1 })).toBe('reabierta');
    expect(ActionState.resolve({ ...base, estado: 'vencida' })).toBe('vencida');
    expect(ActionState.resolve({ ...base, estado: 'completada', fechaCierre: '2026-05-01' })).toBe('reportada');
    expect(ActionState.resolve({ ...base, estado: 'completada', verificacionEficacia: 'ok' })).toBe('verificada');
  });

  it('valida las transiciones de cierre y verificación', () => {
    expect(() => ActionTransitions.assertCanReport('abierta', 1)).not.toThrow();
    expect(() => ActionTransitions.assertCanReport('vencida', 1)).not.toThrow();
    expect(() => ActionTransitions.assertCanReport('abierta', 0)).toThrow(/prueba/);
    expect(() => ActionTransitions.assertCanReport('reportada', 1)).toThrow();
    expect(() => ActionTransitions.assertCanVerify('reportada', 1)).not.toThrow();
    expect(() => ActionTransitions.assertCanVerify('abierta', 1)).toThrow();
    expect(() => ActionTransitions.assertCanVerify('reportada', 0)).toThrow();
  });

  it('un auditor no verifica su propia acción', () => {
    expect(VerifierEligibility.isEligible('a', 'b')).toBe(true);
    expect(VerifierEligibility.isEligible('a', 'a')).toBe(false);
    expect(() => VerifierEligibility.assertEligible('a', 'a')).toThrow(/responsable/);
  });

  it('controla la lectura de acciones por rol', () => {
    const reportada = { responsableId: 'du', estado: 'reportada' } as AccionDetalle;
    const abierta = { responsableId: 'du', estado: 'abierta' } as AccionDetalle;
    expect(AccionAccess.canRead(reportada, 'gestor', 'g')).toBe(true);
    expect(AccionAccess.canRead(abierta, 'dueno_proceso', 'du')).toBe(true);
    expect(AccionAccess.canRead(abierta, 'dueno_proceso', 'otro')).toBe(false);
    expect(AccionAccess.canRead(reportada, 'auditor', 'au')).toBe(true);
    expect(AccionAccess.canRead(abierta, 'auditor', 'au')).toBe(false);
    expect(AccionAccess.canRead(reportada, 'auditor', 'du')).toBe(false);
    expect(AccionAccess.canRead(reportada, 'lider', 'l')).toBe(false);
  });
});
