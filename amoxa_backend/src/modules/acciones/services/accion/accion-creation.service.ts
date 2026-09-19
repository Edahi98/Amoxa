import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { accion, auditoria, hallazgo, proceso, programaAuditoria, usuario } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { DeadlineCalculator } from '@acciones-rules/deadline-calculator.js';
import type { CrearAccionInput } from '@validators-acciones/crear-accion.schema.js';

export interface AccionCreada {
  id: string;
  hallazgoId: string;
  estado: string;
  fechaLimite: string;
  diasRestantes: number;
}

@Injectable()
export class AccionCreationService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly notifications: NotificationService,
    private readonly versions: RecordVersionService,
  ) {}

  async create(hallazgoId: string, user: TokenPayload, input: CrearAccionInput, now: Date = new Date()): Promise<AccionCreada> {
    DeadlineCalculator.assertNotPast(input.fecha_limite, now);

    return this.db.transaction(async (tx) => {
      const [found] = await tx
        .select({ hallazgo, procesoDueno: proceso.duenoUsuarioId })
        .from(hallazgo)
        .innerJoin(proceso, eq(hallazgo.procesoId, proceso.id))
        .innerJoin(auditoria, eq(hallazgo.auditoriaId, auditoria.id))
        .innerJoin(programaAuditoria, eq(auditoria.programaId, programaAuditoria.id))
        .where(and(eq(hallazgo.id, hallazgoId), eq(programaAuditoria.organizacionId, user.organizacionId)));
      if (found === undefined) {
        throw new NotFoundException('Hallazgo no encontrado');
      }
      if (found.hallazgo.tipo !== 'NC') {
        throw new UnprocessableEntityException('Solo una no conformidad requiere una acción correctiva.');
      }
      if (found.hallazgo.estado === 'cerrado') {
        throw new UnprocessableEntityException('La no conformidad ya está cerrada.');
      }

      const [self] = await tx.select({ procesoId: usuario.procesoId }).from(usuario).where(eq(usuario.id, user.sub));
      if (found.procesoDueno !== user.sub && self?.procesoId !== found.hallazgo.procesoId) {
        throw new ForbiddenException('Solo el dueño del proceso auditado puede crear la acción de esta no conformidad.');
      }

      const [responsable] = await tx
        .select({ id: usuario.id })
        .from(usuario)
        .where(
          and(
            eq(usuario.id, input.responsable_id),
            eq(usuario.organizacionId, user.organizacionId),
            inArray(usuario.rol, ['auditado', 'auditor']),
          ),
        );
      if (responsable === undefined) {
        throw new UnprocessableEntityException('El responsable debe ser una persona de su organización.');
      }

      const existing = await tx
        .select({ estado: accion.estado, verificacion: accion.verificacionEficacia })
        .from(accion)
        .where(eq(accion.hallazgoId, hallazgoId));
      if (existing.some((row) => !(row.estado === 'completada' && row.verificacion === 'ok'))) {
        throw new ConflictException('Esta no conformidad ya tiene una acción correctiva en curso.');
      }

      const [created] = await tx
        .insert(accion)
        .values({
          hallazgoId,
          responsableId: input.responsable_id,
          tipo: 'correctiva',
          descripcion: input.correccion,
          causaRaiz: input.causa_raiz,
          fechaLimite: input.fecha_limite,
          estado: 'pendiente',
        })
        .returning({ id: accion.id });

      await this.versions.record(
        {
          entidadTipo: 'accion',
          entidadId: created.id,
          creadoPorId: user.sub,
          contenido: {
            hallazgoId,
            responsableId: input.responsable_id,
            correccion: input.correccion,
            causaRaiz: input.causa_raiz,
            fechaLimite: input.fecha_limite,
            estado: 'abierta',
          },
        },
        tx,
      );
      if (input.responsable_id !== user.sub) {
        await this.notifications.notifyUsers(
          [input.responsable_id],
          {
            tipo: 'accion_asignada',
            titulo: 'Acción correctiva asignada',
            mensaje: `Se le asignó una acción correctiva con fecha límite ${input.fecha_limite}.`,
            entidadTipo: 'accion',
            entidadId: created.id,
          },
          tx,
        );
      }
      return {
        id: created.id,
        hallazgoId,
        estado: 'abierta',
        fechaLimite: input.fecha_limite,
        diasRestantes: DeadlineCalculator.daysLeft(input.fecha_limite, now) ?? 0,
      };
    });
  }
}
