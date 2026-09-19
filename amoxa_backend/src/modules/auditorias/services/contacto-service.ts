import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { auditoria, contactoAuditoria } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import type { ContactoConfirmacionInput } from '@validators-auditorias-contacto/contacto-confirmacion.schema.js';
import type { ContactoRespuestaInput } from '@validators-auditorias-contacto/contacto-respuesta.schema.js';
import { RuleViolation } from '@auditorias-errors/rule-violation.js';
import { AuditStatusTransitions } from '@auditorias-rules/audit-status-transitions.js';
import { ContactViability } from '@auditorias-rules/contact-viability.js';
import type { AuditoriaDetalle } from '@auditorias-types/auditoria-detalle.js';
import { AuditRecipients } from '@auditorias-services/audit-recipients.js';
import { AuditoriaAccess } from '@auditorias-services-auditoria/auditoria-access.js';
import { AuditoriaRecorder } from '@auditorias-services-auditoria/auditoria-recorder.js';

@Injectable()
export class ContactoService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly access: AuditoriaAccess,
    private readonly recorder: AuditoriaRecorder,
    private readonly notifications: NotificationService,
  ) {}

  public async confirm(id: string, input: ContactoConfirmacionInput, user: TokenPayload): Promise<AuditoriaDetalle> {
    const actual = await this.access.asLeader(id, user);
    this.assertPlanning(actual);

    const viability = {
      informacionSuficiente: input.informacion_suficiente,
      cooperacion: input.cooperacion,
      tiempo: input.tiempo,
    };
    if (!ContactViability.isComplete(viability)) {
      throw RuleViolation.unprocessable(
        'VIABILIDAD_INCOMPLETA',
        `No se puede confirmar la viabilidad sin información, cooperación y tiempo suficientes. Falta: ${ContactViability.missingLabels(viability).join(', ')}.`,
      );
    }

    return this.db.transaction(async (tx) => {
      const values = { ...viability, observaciones: input.observaciones ?? null, confirmadoPorId: user.sub, confirmadoEn: new Date() };
      await tx
        .insert(contactoAuditoria)
        .values({ auditoriaId: id, ...values })
        .onConflictDoUpdate({ target: contactoAuditoria.auditoriaId, set: values });
      await tx.update(auditoria).set({ viabilidadOk: true }).where(eq(auditoria.id, id));

      const detalle = await this.recorder.record(id, user, tx);
      await this.notifications.notifyUsers(
        await AuditRecipients.area(detalle, tx),
        {
          tipo: 'contacto_confirmado',
          titulo: 'Contacto de auditoría',
          mensaje: `El líder ${detalle.liderNombre} confirmó la viabilidad de la auditoría. Responda el contacto con la información, cooperación y tiempo de su área.`,
          entidadTipo: 'auditoria',
          entidadId: id,
        },
        tx,
      );
      return detalle;
    });
  }

  public async respond(id: string, input: ContactoRespuestaInput, user: TokenPayload): Promise<AuditoriaDetalle> {
    const actual = await this.access.asAreaOwner(id, user);
    this.assertPlanning(actual);
    if (input.respuesta === undefined || input.respuesta.trim() === '') {
      throw RuleViolation.unprocessable('RESPUESTA_VACIA', 'Escriba su respuesta al líder.');
    }
    const respuesta = input.respuesta.trim();

    return this.db.transaction(async (tx) => {
      const values = { respuestaArea: respuesta, respondidoPorId: user.sub, respondidoEn: new Date() };
      await tx
        .insert(contactoAuditoria)
        .values({ auditoriaId: id, ...values })
        .onConflictDoUpdate({ target: contactoAuditoria.auditoriaId, set: values });

      const detalle = await this.recorder.record(id, user, tx);
      await this.notifications.notifyUsers(
        [detalle.liderId],
        {
          tipo: 'contacto_respondido',
          titulo: 'Respuesta del área auditada',
          mensaje: 'El área auditada respondió al contacto de la auditoría.',
          entidadTipo: 'auditoria',
          entidadId: id,
        },
        tx,
      );
      return detalle;
    });
  }

  private assertPlanning(actual: AuditoriaDetalle): void {
    if (!AuditStatusTransitions.isPlanning(actual.estado)) {
      throw RuleViolation.unprocessable(
        'AUDITORIA_NO_PLANIFICABLE',
        `La auditoría está ${AuditStatusTransitions.describe(actual.estado)}: el contacto ya no se puede cambiar.`,
      );
    }
  }
}
