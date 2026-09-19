import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { auditoria, auditoriaProceso, plantillaChecklist, proceso, programaAuditoria, usuario } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import type { CrearAuditoriaInput } from '@validators-auditorias/crear-auditoria.schema.js';
import { RuleViolation } from '@auditorias-errors/rule-violation.js';
import { TemplateVigency } from '@auditorias-rules/template-vigency.js';
import type { AuditoriaDetalle } from '@auditorias-types/auditoria-detalle.js';
import { AuditoriaRecorder } from '@auditorias-services-auditoria/auditoria-recorder.js';

@Injectable()
export class AuditoriaCreator {
  private static readonly OPEN_PROGRAM_STATES: readonly string[] = ['aprobado', 'en_ejecucion'];

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly recorder: AuditoriaRecorder,
    private readonly notifications: NotificationService,
  ) {}

  public async create(programaId: string, input: CrearAuditoriaInput, user: TokenPayload): Promise<AuditoriaDetalle> {
    const [programa] = await this.db
      .select({ id: programaAuditoria.id, estado: programaAuditoria.estado, periodo: programaAuditoria.periodo })
      .from(programaAuditoria)
      .where(and(eq(programaAuditoria.id, programaId), eq(programaAuditoria.organizacionId, user.organizacionId)))
      .limit(1);
    if (programa === undefined) {
      throw new NotFoundException('Programa no encontrado');
    }
    if (!AuditoriaCreator.OPEN_PROGRAM_STATES.includes(programa.estado)) {
      throw RuleViolation.unprocessable(
        'PROGRAMA_NO_APROBADO',
        'Solo se pueden crear auditorías dentro de un programa aprobado por la alta dirección.',
      );
    }

    const [plantilla] = await this.db
      .select({ vigente: plantillaChecklist.vigente })
      .from(plantillaChecklist)
      .where(eq(plantillaChecklist.id, input.plantillaId))
      .limit(1);
    if (!TemplateVigency.isCurrent(plantilla)) {
      throw RuleViolation.unprocessable('PLANTILLA_NO_VIGENTE', 'Solo se pueden usar plantillas vigentes.');
    }

    const procesoIds = [...new Set(input.procesoIds)];
    const procesos = await this.db
      .select({ id: proceso.id })
      .from(proceso)
      .where(and(inArray(proceso.id, procesoIds), eq(proceso.organizacionId, user.organizacionId)));
    if (procesos.length !== procesoIds.length) {
      throw RuleViolation.unprocessable('PROCESO_INVALIDO', 'Alguno de los procesos elegidos no pertenece a la organización.');
    }

    const [lider] = await this.db
      .select({ id: usuario.id, procesoId: usuario.procesoId })
      .from(usuario)
      .where(and(eq(usuario.id, input.liderId), eq(usuario.organizacionId, user.organizacionId), eq(usuario.rol, 'lider_auditor')))
      .limit(1);
    if (lider === undefined) {
      throw RuleViolation.unprocessable('LIDER_INVALIDO', 'El líder debe ser un líder de auditoría de la organización.');
    }
    if (lider.procesoId !== null && procesoIds.includes(lider.procesoId)) {
      throw RuleViolation.unprocessable('LIDER_CON_CONFLICTO', 'El líder pertenece a un proceso que se audita: no puede auditar su propia área.');
    }

    return this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(auditoria)
        .values({
          programaId,
          plantillaId: input.plantillaId,
          liderId: input.liderId,
          objetivos: input.objetivos,
          criterios: input.criterios,
          metodo: input.metodo,
          fechaPlan: input.fechaPlan,
        })
        .returning({ id: auditoria.id });
      await tx.insert(auditoriaProceso).values(procesoIds.map((procesoId) => ({ auditoriaId: created.id, procesoId })));
      const detalle = await this.recorder.record(created.id, user, tx);
      await this.notifications.notifyUsers(
        [input.liderId],
        {
          tipo: 'auditoria_asignada',
          titulo: 'Auditoría asignada',
          mensaje: `Se le asignó como líder de una auditoría del programa ${programa.periodo}. Defina su alcance, criterios y método.`,
          entidadTipo: 'auditoria',
          entidadId: created.id,
        },
        tx,
      );
      return detalle;
    });
  }
}
