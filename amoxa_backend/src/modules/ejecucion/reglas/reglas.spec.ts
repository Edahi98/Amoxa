import { AuditTransitions } from '@ejecucion-reglas/audit-transitions.js';
import { ChecklistMapper } from '@ejecucion-reglas-checklist/checklist-mapper.js';
import { ChecklistProgress } from '@ejecucion-reglas-checklist/checklist-progress.js';
import { ClosureEligibility } from '@ejecucion-reglas/closure-eligibility.js';
import { FindingRules } from '@ejecucion-reglas/finding-rules.js';
import { MeetingRules } from '@ejecucion-reglas/meeting-rules.js';

describe('ChecklistProgress', () => {
  it('calcula avance y pendientes', () => {
    expect(ChecklistProgress.compute(4, 1)).toEqual({ total: 4, respondidas: 1, pendientes: 3, avance: 25 });
    expect(ChecklistProgress.compute(3, 3)).toEqual({ total: 3, respondidas: 3, pendientes: 0, avance: 100 });
  });

  it('tolera checklist vacío y valores fuera de rango', () => {
    expect(ChecklistProgress.compute(0, 0).avance).toBe(0);
    expect(ChecklistProgress.compute(2, 9).respondidas).toBe(2);
    expect(ChecklistProgress.compute(2, -1).respondidas).toBe(0);
  });

  it('suma versiones', () => {
    expect(ChecklistProgress.version([1, 2, 3])).toBe(6);
    expect(ChecklistProgress.version([])).toBe(0);
  });
});

describe('ChecklistMapper', () => {
  it('convierte resultados en ambos sentidos y rechaza desconocidos', () => {
    expect(ChecklistMapper.toDb('no_conforme')).toBe('NC');
    expect(ChecklistMapper.toDb('C')).toBe('C');
    expect(ChecklistMapper.toDb('otro')).toBeUndefined();
    expect(ChecklistMapper.toDb('constructor')).toBeUndefined();
    expect(ChecklistMapper.toClient('NA')).toBe('no_aplica');
  });

  it('interpreta las claves de pregunta', () => {
    expect(ChecklistMapper.parseKey('q12')).toBe(12);
    expect(ChecklistMapper.parseKey('x1')).toBeUndefined();
    expect(ChecklistMapper.keyOf(3)).toBe('q3');
    expect(ChecklistMapper.criterion('ISO_9001')).toBe('norma');
    expect(ChecklistMapper.criterion('propio')).toBe('procedimiento');
  });
});

describe('FindingRules', () => {
  it('exige cláusula y evidencia verificada en una no conformidad', () => {
    const codes = FindingRules.violations({ kind: 'nc_mayor', clausula: ' ', evidenciaVerificada: false }).map((item) => item.code);

    expect(codes).toEqual(['NC_SIN_CLAUSULA', 'NC_SIN_EVIDENCIA_VERIFICADA']);
  });

  it('permite una no conformidad completa y no exige nada a las observaciones', () => {
    expect(FindingRules.violations({ kind: 'nc_menor', clausula: '8.4', evidenciaVerificada: true })).toEqual([]);
    expect(FindingRules.violations({ kind: 'observacion', evidenciaVerificada: false })).toEqual([]);
  });

  it('traduce el tipo de pantalla al modelo de datos y de vuelta', () => {
    expect(FindingRules.resolve('nc_mayor')).toEqual({ tipo: 'NC', clasificacion: 'mayor', categoria: 'nc_mayor' });
    expect(FindingRules.resolve('oportunidad').tipo).toBe('OM');
    expect(FindingRules.kindOf({ tipo: 'NC', clasificacion: 'menor', categoria: null })).toBe('nc_menor');
    expect(FindingRules.kindOf({ tipo: 'OM', clasificacion: null, categoria: 'oportunidad' })).toBe('oportunidad');
    expect(FindingRules.kindOf({ tipo: 'OM', clasificacion: null, categoria: null })).toBe('observacion');
  });
});

describe('ClosureEligibility', () => {
  it('bloquea el cierre con hallazgos sin revisar', () => {
    const result = ClosureEligibility.evaluate([
      { id: 'a', revisado: true },
      { id: 'b', revisado: false },
    ]);

    expect(result.puedeCerrar).toBe(false);
    expect(result.pendientes).toEqual(['b']);
    expect(result.message).toContain('sin revisar');
  });

  it('permite cerrar sin hallazgos o con todos revisados', () => {
    expect(ClosureEligibility.evaluate([]).puedeCerrar).toBe(true);
    expect(ClosureEligibility.evaluate([{ id: 'a', revisado: true }]).puedeCerrar).toBe(true);
  });
});

describe('AuditTransitions', () => {
  it('solo abre una auditoría planificada con plan aprobado', () => {
    expect(AuditTransitions.openViolation('planificada', true)).toBeUndefined();
    expect(AuditTransitions.openViolation('planificada', false)).toContain('plan');
    expect(AuditTransitions.openViolation('en_curso', true)).toBeDefined();
    expect(AuditTransitions.openViolation('cerrada', true)).toBeDefined();
  });

  it('solo admite ejecución y cierre en curso', () => {
    expect(AuditTransitions.executionViolation('en_curso')).toBeUndefined();
    expect(AuditTransitions.executionViolation('planificada')).toContain('apertura');
    expect(AuditTransitions.executionViolation('cerrada')).toContain('cerrada');
    expect(AuditTransitions.executionViolation('finalizada')).toContain('finalizada');
    expect(AuditTransitions.closeViolation('en_curso')).toBeUndefined();
    expect(AuditTransitions.closeViolation('cerrada')).toBeDefined();
    expect(AuditTransitions.closeViolation('planificada')).toBeDefined();
  });
});

describe('MeetingRules', () => {
  it('exige al menos un asistente además del líder', () => {
    expect(MeetingRules.attendeesViolation([], 'l')).toBeDefined();
    expect(MeetingRules.attendeesViolation(['l'], 'l')).toBeDefined();
    expect(MeetingRules.attendeesViolation(['a', 'a'], 'l')).toBeUndefined();
    expect(MeetingRules.attendees(['a', 'a', 'l', 'b'], 'l')).toEqual(['a', 'b']);
  });

  it('exige motivo y resultado', () => {
    expect(MeetingRules.motiveViolation('  ')).toBeDefined();
    expect(MeetingRules.motiveViolation('No hubo incumplimiento')).toBeUndefined();
    expect(MeetingRules.resultViolation(undefined)).toBeDefined();
    expect(MeetingRules.resultViolation('aceptado')).toBeUndefined();
  });
});
