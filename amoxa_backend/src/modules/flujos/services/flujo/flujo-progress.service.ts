import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { accion, auditoria, flujoInstancia, hallazgo, plantillaChecklist } from '@schemas/index.js';
import { WorkflowCatalog } from '@shared-workflow/workflow-catalog.js';

export type FlujoInstanciaRow = InferSelectModel<typeof flujoInstancia>;
export type StepState = 'completado' | 'en_curso' | 'pendiente';
export type FlowState = 'en_curso' | 'concluido' | 'cancelado';

export interface StepProgress {
  id: string;
  title: string;
  state: StepState;
  detail: string;
}

export interface FlujoProgress {
  state: FlowState;
  steps: StepProgress[];
  completed: number;
  total: number;
  currentStepId: string | null;
  canConclude: boolean;
  auditoriaId: string;
  plantillaId: string;
  auditoriaNombre: string;
}

interface Facts {
  templatePublished: boolean;
  auditState: string;
  closedActions: number;
  totalActions: number;
  nonConformities: number;
  nonConformitiesWithAction: number;
}

@Injectable()
export class FlujoProgressService {
  private static readonly WAITING = 'Se habilita al completar el paso anterior.';

  constructor(@Inject(DB) private readonly db: Db) {}

  public async compute(instance: FlujoInstanciaRow, executor: DbExecutor = this.db): Promise<FlujoProgress> {
    const workflow = WorkflowCatalog.find(instance.flujoId);
    if (workflow === undefined) {
      throw new NotFoundException('Flujo no encontrado');
    }

    const [audit] = await executor
      .select({ estado: auditoria.estado, plantillaId: auditoria.plantillaId, plantilla: plantillaChecklist.nombre, publicada: plantillaChecklist.estado, vigente: plantillaChecklist.vigente })
      .from(auditoria)
      .innerJoin(plantillaChecklist, eq(plantillaChecklist.id, auditoria.plantillaId))
      .where(eq(auditoria.id, instance.auditoriaId))
      .limit(1);
    if (!audit) {
      throw new NotFoundException('Auditoría no encontrada');
    }

    const facts = await this.facts(instance.auditoriaId, audit.estado, audit.publicada === 'publicada' && audit.vigente, executor);
    const completedFlags = FlujoProgressService.completion(facts, instance.completadoEn !== null);
    const cancelled = facts.auditState === 'cancelada';
    const firstOpen = completedFlags.indexOf(false);

    const steps = workflow.steps.map((step, index): StepProgress => {
      const state: StepState = completedFlags[index] ? 'completado' : !cancelled && index === firstOpen ? 'en_curso' : 'pendiente';
      return { id: step.id, title: step.title, state, detail: FlujoProgressService.detail(step.id, state, facts) };
    });
    const completed = steps.filter((step) => step.state === 'completado').length;

    return {
      state: cancelled ? 'cancelado' : completed === steps.length ? 'concluido' : 'en_curso',
      steps,
      completed,
      total: steps.length,
      currentStepId: steps.find((step) => step.state === 'en_curso')?.id ?? null,
      canConclude: !cancelled && completedFlags.slice(0, -1).every(Boolean) && !completedFlags[completedFlags.length - 1],
      auditoriaId: instance.auditoriaId,
      plantillaId: audit.plantillaId,
      auditoriaNombre: audit.plantilla,
    };
  }

  private async facts(auditoriaId: string, auditState: string, templatePublished: boolean, executor: DbExecutor): Promise<Facts> {
    const findings = await executor
      .select({ id: hallazgo.id })
      .from(hallazgo)
      .where(and(eq(hallazgo.auditoriaId, auditoriaId), eq(hallazgo.tipo, 'NC')));
    const actions = await executor
      .select({ hallazgoId: accion.hallazgoId, estado: accion.estado, eficacia: accion.verificacionEficacia })
      .from(accion)
      .innerJoin(hallazgo, eq(accion.hallazgoId, hallazgo.id))
      .where(and(eq(hallazgo.auditoriaId, auditoriaId), eq(hallazgo.tipo, 'NC')));

    return {
      templatePublished,
      auditState,
      closedActions: actions.filter((row) => row.estado === 'completada' && row.eficacia === 'ok').length,
      totalActions: actions.length,
      nonConformities: findings.length,
      nonConformitiesWithAction: new Set(actions.map((row) => row.hallazgoId)).size,
    };
  }

  private static completion(facts: Facts, concluded: boolean): boolean[] {
    const executed = facts.auditState === 'cerrada' || facts.auditState === 'finalizada';
    const reported = facts.auditState === 'finalizada';
    const actionsClosed =
      reported &&
      facts.nonConformitiesWithAction === facts.nonConformities &&
      facts.closedActions === facts.totalActions;
    return [facts.templatePublished, executed, reported, actionsClosed, concluded];
  }

  private static detail(stepId: string, state: StepState, facts: Facts): string {
    if (state === 'pendiente') return FlujoProgressService.WAITING;
    const done = state === 'completado';
    switch (stepId) {
      case 'plantillas':
        return done ? 'La plantilla está publicada y vigente.' : 'La plantilla sigue en borrador o no está vigente: publique una versión.';
      case 'ejecucion':
        if (done) return 'La auditoría está cerrada.';
        return facts.auditState === 'planificada'
          ? 'La auditoría está planificada: inicie con la reunión de apertura.'
          : 'La auditoría está en curso: complete el checklist, la evidencia y los hallazgos, y cierre.';
      case 'informe':
        return done ? 'El informe fue distribuido a la alta dirección.' : 'Revise, firme y distribuya el informe a la alta dirección.';
      case 'acciones':
        if (done) return 'Todas las acciones están cerradas con eficacia verificada.';
        return facts.nonConformitiesWithAction < facts.nonConformities
          ? `Faltan acciones: ${facts.nonConformitiesWithAction} de ${facts.nonConformities} no conformidades tienen acción.`
          : `${facts.closedActions} de ${facts.totalActions} acciones cerradas con eficacia verificada.`;
      default:
        return done ? 'Flujo concluido.' : 'Revise el tablero y los registros, y concluya el flujo.';
    }
  }
}
