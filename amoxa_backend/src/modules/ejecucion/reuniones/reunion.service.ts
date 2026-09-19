import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { asistenciaReunion, equipoAuditoria, proceso, reunionAuditoria, usuario } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { AuditoriaAccessService } from '@ejecucion-acceso-auditoria/auditoria-access.service.js';
import type { AuditoriaContext, AuditoriaRow } from '@ejecucion-acceso-auditoria/auditoria-context.js';
import { BusinessRule } from '@ejecucion-reglas/business-rule.js';
import type { AttendeeView, ReunionView } from '@ejecucion-reuniones/reunion-view.js';

export type ReunionRow = typeof reunionAuditoria.$inferSelect;
export type ReunionTipo = ReunionRow['tipo'];

@Injectable()
export class ReunionService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly access: AuditoriaAccessService,
    private readonly versions: RecordVersionService,
  ) {}

  public async find(executor: DbExecutor, auditoriaId: string, tipo: ReunionTipo): Promise<ReunionRow | undefined> {
    const [row] = await executor
      .select()
      .from(reunionAuditoria)
      .where(and(eq(reunionAuditoria.auditoriaId, auditoriaId), eq(reunionAuditoria.tipo, tipo)))
      .limit(1);
    return row;
  }

  public async getOrCreate(
    tx: DbExecutor,
    auditoria: AuditoriaRow,
    tipo: ReunionTipo,
    user: TokenPayload,
  ): Promise<ReunionRow> {
    const found = await this.find(tx, auditoria.id, tipo);
    if (found !== undefined) {
      return found;
    }
    const [row] = await tx
      .insert(reunionAuditoria)
      .values({ auditoriaId: auditoria.id, tipo, dirigidaPorId: auditoria.liderId })
      .returning();
    await this.recordVersion(tx, row, user);
    return row;
  }

  public async recordVersion(tx: DbExecutor, row: ReunionRow, user: TokenPayload): Promise<void> {
    await this.versions.record(
      {
        entidadTipo: 'reunion_auditoria',
        entidadId: row.id,
        creadoPorId: user.sub,
        contenido: {
          auditoriaId: row.auditoriaId,
          tipo: row.tipo,
          dirigidaPorId: row.dirigidaPorId,
          notas: row.notas,
          realizadaEn: row.realizadaEn.toISOString(),
        },
      },
      tx,
    );
  }

  public async updateNotes(tx: DbExecutor, reunion: ReunionRow, notas: string | undefined, user: TokenPayload): Promise<ReunionRow> {
    if (notas === undefined || notas === reunion.notas) {
      return reunion;
    }
    const [row] = await tx
      .update(reunionAuditoria)
      .set({ notas })
      .where(eq(reunionAuditoria.id, reunion.id))
      .returning();
    await this.recordVersion(tx, row, user);
    return row;
  }

  public async assertSameOrganization(
    tx: DbExecutor,
    organizacionId: string,
    ids: readonly string[],
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const found = await tx
      .select({ id: usuario.id })
      .from(usuario)
      .where(and(eq(usuario.organizacionId, organizacionId), inArray(usuario.id, [...ids])));
    if (found.length !== new Set(ids).size) {
      throw BusinessRule.violation('Alguno de los asistentes indicados no pertenece a la organización.');
    }
  }

  public async addAttendance(
    tx: DbExecutor,
    reunionId: string,
    usuarioId: string,
    rol: 'preside' | 'asiste',
    registradaPorId: string,
    confirmada: boolean,
  ): Promise<void> {
    const confirmadaEn = confirmada ? new Date() : null;
    await tx
      .insert(asistenciaReunion)
      .values({ reunionId, usuarioId, rol, registradaPorId, confirmadaEn })
      .onConflictDoUpdate({
        target: [asistenciaReunion.reunionId, asistenciaReunion.usuarioId],
        set: confirmada ? { confirmadaEn: new Date() } : { usuarioId },
      });
  }

  public async attendees(executor: DbExecutor, reunionId: string): Promise<AttendeeView[]> {
    const rows = await executor
      .select({
        usuarioId: asistenciaReunion.usuarioId,
        nombre: usuario.nombre,
        rolUsuario: usuario.rol,
        rolReunion: asistenciaReunion.rol,
        confirmadaEn: asistenciaReunion.confirmadaEn,
      })
      .from(asistenciaReunion)
      .innerJoin(usuario, eq(usuario.id, asistenciaReunion.usuarioId))
      .where(eq(asistenciaReunion.reunionId, reunionId))
      .orderBy(asc(asistenciaReunion.rol), asc(usuario.nombre));
    return rows.map((row) => ({
      usuarioId: row.usuarioId,
      nombre: row.nombre,
      rolUsuario: row.rolUsuario,
      rolReunion: row.rolReunion,
      confirmadaEn: row.confirmadaEn?.toISOString() ?? null,
    }));
  }

  public async candidates(
    context: AuditoriaContext,
    executor: DbExecutor = this.db,
  ): Promise<{ id: string; nombre: string; rol: string }[]> {
    const team = await executor
      .select({ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol })
      .from(equipoAuditoria)
      .innerJoin(usuario, eq(usuario.id, equipoAuditoria.auditorId))
      .where(and(eq(equipoAuditoria.auditoriaId, context.auditoria.id), isNull(equipoAuditoria.retiradoEn)));
    const area =
      context.procesoIds.length === 0
        ? []
        : await executor
            .select({ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol })
            .from(proceso)
            .innerJoin(usuario, eq(usuario.id, proceso.duenoUsuarioId))
            .where(inArray(proceso.id, context.procesoIds));
    const unique = new Map([...team, ...area].map((item) => [item.id, item]));
    unique.delete(context.auditoria.liderId);
    return [...unique.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  public async viewOf(
    context: AuditoriaContext,
    tipo: ReunionTipo,
    executor: DbExecutor = this.db,
  ): Promise<ReunionView> {
    const reunion = await this.find(executor, context.auditoria.id, tipo);
    if (reunion === undefined) {
      return { id: null, tipo, registrada: false, dirigidaPor: null, notas: null, realizadaEn: null, asistentes: [] };
    }
    const [leader] = await executor
      .select({ nombre: usuario.nombre })
      .from(usuario)
      .where(eq(usuario.id, reunion.dirigidaPorId));
    return {
      id: reunion.id,
      tipo,
      registrada: true,
      dirigidaPor: leader?.nombre ?? null,
      notas: reunion.notas,
      realizadaEn: reunion.realizadaEn.toISOString(),
      asistentes: await this.attendees(executor, reunion.id),
    };
  }

  public async view(auditoriaId: string, tipo: ReunionTipo, user: TokenPayload): Promise<ReunionView> {
    const context = await this.access.loadAsMember(auditoriaId, user);
    return this.viewOf(context, tipo);
  }
}
