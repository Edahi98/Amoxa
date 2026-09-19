import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { organizacion } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import type { DocxFile } from '@docx/docx-file.js';
import { AuditNotificationDocument } from '@docx-auditorias/audit-notification-document.js';
import { AuditPlanDocument } from '@docx-auditorias/audit-plan-document.js';
import type { AuditNotificationDocumentData, AuditPlanDocumentData } from '@docx-auditorias/audit-document-data.js';
import { PlanStatusTransitions } from '@auditorias-rules-plan/plan-status-transitions.js';
import type { AuditoriaDetalle } from '@auditorias-types/auditoria-detalle.js';
import { AuditLabels } from '@auditorias-types/audit-labels.js';
import { AuditoriaAccess } from '@auditorias-services-auditoria/auditoria-access.js';

@Injectable()
export class AuditoriaDocuments {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly access: AuditoriaAccess,
  ) {}

  public async plan(id: string, user: TokenPayload, role: SessionRole): Promise<DocxFile> {
    const detalle = await this.access.visible(id, user, role);
    return AuditPlanDocument.build(await this.planData(detalle));
  }

  public async notification(id: string, user: TokenPayload, role: SessionRole): Promise<DocxFile> {
    const detalle = await this.access.visible(id, user, role);
    return AuditNotificationDocument.build(await this.notificationData(detalle));
  }

  public async planData(detalle: AuditoriaDetalle): Promise<AuditPlanDocumentData> {
    const names = new Map(detalle.equipo.map((member) => [member.auditorId, member.nombre]));
    const groups = new Map<string, string[]>();
    for (const task of detalle.plan.tareas) {
      const owner = names.get(task.auditorId) ?? task.auditorId;
      groups.set(owner, [...(groups.get(owner) ?? []), task.descripcion]);
    }
    return {
      organizacion: await this.organizationName(detalle.organizacionId),
      auditoriaId: detalle.id,
      periodo: detalle.periodo,
      objetivo: detalle.objetivos,
      procesos: detalle.procesos.map((item) => item.nombre),
      criterios: detalle.criterios,
      metodo: AuditLabels.method(detalle.metodo),
      plantilla: detalle.plantilla.nombre,
      lider: detalle.liderNombre,
      equipo: this.team(detalle),
      fechaInicio: detalle.plan.fechaInicio,
      fechaFin: detalle.plan.fechaFin,
      agenda: detalle.plan.agenda,
      tareas: [...groups.entries()].map(([auditor, tareas]) => ({ auditor, tareas })),
      estadoPlan: PlanStatusTransitions.describe(detalle.plan.estado),
      planVersion: Math.max(detalle.plan.version, 1),
      aprobadoEn:
        detalle.plan.estado === 'aprobado' && detalle.plan.respondidoEn !== null
          ? detalle.plan.respondidoEn.toISOString().slice(0, 10)
          : null,
    };
  }

  public async notificationData(detalle: AuditoriaDetalle): Promise<AuditNotificationDocumentData> {
    return {
      organizacion: await this.organizationName(detalle.organizacionId),
      auditoriaId: detalle.id,
      periodo: detalle.periodo,
      procesos: detalle.procesos.map((item) => item.nombre),
      criterios: detalle.criterios,
      metodo: AuditLabels.method(detalle.metodo),
      lider: detalle.liderNombre,
      equipo: this.team(detalle),
      fechaInicio: detalle.plan.fechaInicio ?? detalle.fechaPlan,
      fechaFin: detalle.plan.fechaFin,
      objetivo: detalle.objetivos,
    };
  }

  private team(detalle: AuditoriaDetalle) {
    return detalle.equipo.map((member) => ({ nombre: member.nombre, rol: AuditLabels.role(member.rol), email: member.email }));
  }

  private async organizationName(organizacionId: string): Promise<string> {
    const [row] = await this.db.select({ nombre: organizacion.nombre }).from(organizacion).where(eq(organizacion.id, organizacionId)).limit(1);
    return row?.nombre ?? 'Organización';
  }
}
