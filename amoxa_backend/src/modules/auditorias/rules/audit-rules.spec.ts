import { AuditStatusTransitions } from '@auditorias-rules/audit-status-transitions.js';
import { ContactViability } from '@auditorias-rules/contact-viability.js';
import { PlanCompleteness } from '@auditorias-rules-plan/plan-completeness.js';
import { PlanStatusTransitions } from '@auditorias-rules-plan/plan-status-transitions.js';
import { ScopeCompleteness } from '@auditorias-rules/scope-completeness.js';
import { TemplateVigency } from '@auditorias-rules/template-vigency.js';

describe('TemplateVigency', () => {
  it('solo acepta plantillas vigentes', () => {
    expect(TemplateVigency.isCurrent({ vigente: true })).toBe(true);
    expect(TemplateVigency.isCurrent({ vigente: false })).toBe(false);
    expect(TemplateVigency.isCurrent(undefined)).toBe(false);
  });

  it('traduce la vigencia al estado que usa la pantalla', () => {
    expect(TemplateVigency.screenState({ vigente: true })).toBe('publicada');
    expect(TemplateVigency.screenState({ vigente: false })).toBe('obsoleta');
  });
});

describe('AuditStatusTransitions', () => {
  it('modela el ciclo planificada, en curso, cerrada y finalizada', () => {
    expect(AuditStatusTransitions.canMove('planificada', 'en_curso')).toBe(true);
    expect(AuditStatusTransitions.canMove('en_curso', 'cerrada')).toBe(true);
    expect(AuditStatusTransitions.canMove('cerrada', 'finalizada')).toBe(true);
  });

  it('no permite saltos ni salir de un estado terminal', () => {
    expect(AuditStatusTransitions.canMove('planificada', 'cerrada')).toBe(false);
    expect(AuditStatusTransitions.canMove('finalizada', 'en_curso')).toBe(false);
    expect(AuditStatusTransitions.canMove('cancelada', 'planificada')).toBe(false);
  });

  it('solo se planifica mientras está planificada y solo inicia con plan aprobado', () => {
    expect(AuditStatusTransitions.isPlanning('planificada')).toBe(true);
    expect(AuditStatusTransitions.isPlanning('en_curso')).toBe(false);
    expect(AuditStatusTransitions.canStart('planificada', 'aprobado')).toBe(true);
    expect(AuditStatusTransitions.canStart('planificada', 'enviado')).toBe(false);
    expect(AuditStatusTransitions.canStart('en_curso', 'aprobado')).toBe(false);
  });
});

describe('PlanStatusTransitions', () => {
  it('sigue el flujo borrador, enviado y aprobado o con propuesta', () => {
    expect(PlanStatusTransitions.canMove('sin_plan', 'borrador')).toBe(true);
    expect(PlanStatusTransitions.canMove('borrador', 'enviado')).toBe(true);
    expect(PlanStatusTransitions.canMove('enviado', 'aprobado')).toBe(true);
    expect(PlanStatusTransitions.canMove('enviado', 'con_propuesta')).toBe(true);
    expect(PlanStatusTransitions.canMove('con_propuesta', 'borrador')).toBe(true);
  });

  it('bloquea enviar sin borrador, aprobar sin envío y modificar un plan aprobado', () => {
    expect(PlanStatusTransitions.canMove('sin_plan', 'enviado')).toBe(false);
    expect(PlanStatusTransitions.canMove('borrador', 'aprobado')).toBe(false);
    expect(PlanStatusTransitions.canMove('con_propuesta', 'enviado')).toBe(false);
    expect(PlanStatusTransitions.canMove('aprobado', 'borrador')).toBe(false);
  });

  it('el alcance solo se edita sin plan enviado ni aprobado', () => {
    expect(PlanStatusTransitions.canEditScope('sin_plan')).toBe(true);
    expect(PlanStatusTransitions.canEditScope('con_propuesta')).toBe(true);
    expect(PlanStatusTransitions.canEditScope('enviado')).toBe(false);
    expect(PlanStatusTransitions.canEditScope('aprobado')).toBe(false);
  });

  it('interpreta un estado desconocido como sin plan', () => {
    expect(PlanStatusTransitions.parse('aprobado')).toBe('aprobado');
    expect(PlanStatusTransitions.parse('xyz')).toBe('sin_plan');
    expect(PlanStatusTransitions.parse(null)).toBe('sin_plan');
  });
});

describe('PlanCompleteness', () => {
  it('acepta un plan con fechas, agenda y tareas', () => {
    expect(PlanCompleteness.missing({ fechaInicio: '2026-11-10', fechaFin: '2026-11-12', agendaCount: 2, tareasCount: 1 })).toEqual([]);
  });

  it('reporta cada faltante con su código', () => {
    const gaps = PlanCompleteness.missing({ fechaInicio: null, fechaFin: null, agendaCount: 0, tareasCount: 0 });

    expect(gaps.map((gap) => gap.codigo)).toEqual(['PLAN_SIN_FECHAS', 'PLAN_SIN_AGENDA', 'PLAN_SIN_TAREAS']);
  });

  it('rechaza un fin anterior al inicio', () => {
    const gaps = PlanCompleteness.missing({ fechaInicio: '2026-11-12', fechaFin: '2026-11-10', agendaCount: 1, tareasCount: 1 });

    expect(gaps.map((gap) => gap.codigo)).toEqual(['PLAN_SIN_FECHAS']);
  });
});

describe('ScopeCompleteness', () => {
  it('acepta un alcance completo', () => {
    expect(ScopeCompleteness.missing({ procesoIds: ['p'], criterios: ['9.2'], plantillaVigente: true, metodo: 'remoto' })).toEqual([]);
  });

  it('reporta procesos, criterios, plantilla y método faltantes', () => {
    const gaps = ScopeCompleteness.missing({ procesoIds: [], criterios: [], plantillaVigente: false, metodo: undefined });

    expect(gaps.map((gap) => gap.codigo)).toEqual(['ALCANCE_SIN_PROCESOS', 'CRITERIOS_VACIOS', 'PLANTILLA_NO_VIGENTE', 'METODO_VACIO']);
  });
});

describe('ContactViability', () => {
  it('exige información, cooperación y tiempo', () => {
    expect(ContactViability.isComplete({ informacionSuficiente: true, cooperacion: true, tiempo: true })).toBe(true);
    expect(ContactViability.isComplete({ informacionSuficiente: true, cooperacion: false, tiempo: true })).toBe(false);
  });

  it('nombra lo que falta', () => {
    expect(ContactViability.missingLabels({ informacionSuficiente: false, cooperacion: true, tiempo: false })).toEqual([
      'información suficiente',
      'tiempo suficiente',
    ]);
  });
});
