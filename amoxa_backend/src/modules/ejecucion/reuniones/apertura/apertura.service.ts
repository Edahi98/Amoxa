import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { auditoria } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import type { RegistrarAperturaInput } from '@validators-ejecucion/registrar-apertura.schema.js';
import { AuditoriaAccessService } from '@ejecucion-acceso-auditoria/auditoria-access.service.js';
import { AuditTransitions } from '@ejecucion-reglas/audit-transitions.js';
import { BusinessRule } from '@ejecucion-reglas/business-rule.js';
import { MeetingRules } from '@ejecucion-reglas/meeting-rules.js';
import { ReunionService } from '@ejecucion-reuniones/reunion.service.js';
import type { ReunionView } from '@ejecucion-reuniones/reunion-view.js';

@Injectable()
export class AperturaService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly access: AuditoriaAccessService,
    private readonly reuniones: ReunionService,
    private readonly versions: RecordVersionService,
    private readonly notifications: NotificationService,
  ) {}

  public async register(auditoriaId: string, user: TokenPayload, input: RegistrarAperturaInput): Promise<ReunionView> {
    return this.db.transaction(async (tx) => {
      const context = await this.access.loadAsMember(auditoriaId, user, tx);
      BusinessRule.assert(AuditTransitions.openViolation(context.auditoria.estado, context.auditoria.planAprobado));
      BusinessRule.assert(MeetingRules.attendeesViolation(input.asistentes, user.sub), 'ASISTENTES_VACIO');
      const attendees = MeetingRules.attendees(input.asistentes, user.sub);
      await this.reuniones.assertSameOrganization(tx, user.organizacionId, attendees);

      const reunion = await this.reuniones.getOrCreate(tx, context.auditoria, 'apertura', user);
      await this.reuniones.updateNotes(tx, reunion, input.notas, user);
      await this.reuniones.addAttendance(tx, reunion.id, user.sub, 'preside', user.sub, true);
      for (const attendee of attendees) {
        await this.reuniones.addAttendance(tx, reunion.id, attendee, 'asiste', user.sub, false);
      }

      const [opened] = await tx
        .update(auditoria)
        .set({ estado: 'en_curso', fechaReal: context.auditoria.fechaReal ?? new Date().toISOString().slice(0, 10) })
        .where(eq(auditoria.id, auditoriaId))
        .returning();
      await this.versions.record(
        {
          entidadTipo: 'auditoria',
          entidadId: opened.id,
          creadoPorId: user.sub,
          contenido: { estado: opened.estado, fechaReal: opened.fechaReal, motivo: 'apertura' },
        },
        tx,
      );
      await this.notifications.notifyUsers(
        attendees,
        {
          tipo: 'reunion_apertura',
          titulo: 'Reunión de apertura',
          mensaje: 'Fue convocado a la reunión de apertura de la auditoría. Confirme su asistencia.',
          entidadTipo: 'auditoria',
          entidadId: auditoriaId,
        },
        tx,
      );
      return this.reuniones.viewOf({ ...context, auditoria: opened }, 'apertura', tx);
    });
  }

  public async confirm(auditoriaId: string, user: TokenPayload): Promise<ReunionView> {
    return this.db.transaction(async (tx) => {
      const context = await this.access.loadAsMember(auditoriaId, user, tx);
      const reunion = await this.reuniones.find(tx, auditoriaId, 'apertura');
      if (reunion === undefined) {
        throw BusinessRule.violation('La reunión de apertura aún no se ha registrado: espere a que el líder la registre.');
      }
      await this.reuniones.addAttendance(tx, reunion.id, user.sub, 'asiste', user.sub, true);
      return this.reuniones.viewOf(context, 'apertura', tx);
    });
  }
}
