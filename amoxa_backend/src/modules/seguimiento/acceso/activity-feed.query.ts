import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, lte, notInArray } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { accion, auditLog, auditoria, hallazgo, passwordRequest, plantillaChecklist, usuario } from '@schemas/index.js';
import { ROLES, type SessionRole } from '@shared/roles.js';
import { RoleMapper } from '@auth-roles/role-mapper.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { AuditVisibility } from '@registros-consulta/audit-visibility.js';
import { SolicitudHierarchy } from '@solicitudes-services-solicitud/solicitud-hierarchy.js';
import { HomeCountsQuery } from '@seguimiento-acceso/home-counts.query.js';

export interface FeedItem {
  id: string;
  title: string;
  description: string;
  meta: string;
}

export interface InicioFeed {
  en_curso: FeedItem[];
  agenda: FeedItem[];
}

@Injectable()
export class ActivityFeedQuery {
  private static readonly LIMIT = 3;
  private static readonly AGENDA_LIMIT = 6;

  private static readonly ACTIONS: Readonly<Record<string, string>> = {
    'system.setup_activated': 'Sistema activado',
    'user.created': 'Usuario creado',
    'user.updated': 'Datos de usuario actualizados',
    'user.role_changed': 'Rol de usuario cambiado',
    'user.status_changed': 'Estado de usuario cambiado',
    'user.invited': 'Invitación generada',
    'profile.updated': 'Perfil actualizado',
    'password.changed': 'Contraseña cambiada',
    'password_request.created': 'Solicitud de contraseña recibida',
    'password_request.approved': 'Solicitud de contraseña aprobada',
    'password_request.rejected': 'Solicitud de contraseña rechazada',
    'password.reset_completed': 'Contraseña restablecida',
    'password_request.expired': 'Solicitudes vencidas',
  };

  constructor(@Inject(DB) private readonly db: Db) {}

  public async load(user: TokenPayload, role: SessionRole, hoy: string = new Date().toISOString().slice(0, 10)): Promise<InicioFeed> {
    return role === 'superusuario' || role === 'administrador' ? this.adminFeed(role) : this.auditFeed(user, role, hoy);
  }

  private async adminFeed(role: SessionRole): Promise<InicioFeed> {
    const handleable = SolicitudHierarchy.handleableDbRoles(role);
    const pending =
      handleable.length === 0
        ? []
        : await this.db
            .select({
              id: passwordRequest.id,
              nombre: usuario.nombre,
              email: usuario.email,
              rol: usuario.rol,
              creada: passwordRequest.createdAt,
            })
            .from(passwordRequest)
            .innerJoin(usuario, eq(usuario.id, passwordRequest.usuarioId))
            .where(and(eq(passwordRequest.status, 'pending'), inArray(usuario.rol, handleable)))
            .orderBy(asc(passwordRequest.createdAt))
            .limit(ActivityFeedQuery.LIMIT);

    const recent = await this.db
      .select({ id: auditLog.id, action: auditLog.action, creada: auditLog.createdAt, actor: usuario.nombre })
      .from(auditLog)
      .leftJoin(usuario, eq(usuario.id, auditLog.actorId))
      .orderBy(desc(auditLog.createdAt))
      .limit(ActivityFeedQuery.AGENDA_LIMIT);

    return {
      en_curso: pending.map((row) => ({
        id: row.id,
        title: row.nombre,
        description: `${row.email} · ${ROLES[RoleMapper.toSessionRole(row.rol)].label}`,
        meta: `Solicitó el ${ActivityFeedQuery.date(row.creada)}`,
      })),
      agenda: recent.map((row) => ({
        id: row.id,
        title: ActivityFeedQuery.ACTIONS[row.action] ?? row.action,
        description: row.actor ?? 'Sistema',
        meta: ActivityFeedQuery.date(row.creada),
      })),
    };
  }

  private async auditFeed(user: TokenPayload, role: SessionRole, hoy: string): Promise<InicioFeed> {
    const audits = AuditVisibility.auditIds(this.db, user, role);
    const running = await this.db
      .select({ id: auditoria.id, plantilla: plantillaChecklist.nombre, metodo: auditoria.metodo, fechaPlan: auditoria.fechaPlan, lider: usuario.nombre })
      .from(auditoria)
      .innerJoin(plantillaChecklist, eq(plantillaChecklist.id, auditoria.plantillaId))
      .innerJoin(usuario, eq(usuario.id, auditoria.liderId))
      .where(and(eq(auditoria.estado, 'en_curso'), inArray(auditoria.id, audits)))
      .orderBy(asc(auditoria.fechaPlan))
      .limit(ActivityFeedQuery.LIMIT);

    const due = await this.db
      .select({ id: accion.id, descripcion: accion.descripcion, limite: accion.fechaLimite, estado: accion.estado })
      .from(accion)
      .innerJoin(hallazgo, eq(accion.hallazgoId, hallazgo.id))
      .where(
        and(
          inArray(hallazgo.auditoriaId, audits),
          notInArray(accion.estado, ['completada', 'vencida']),
          gte(accion.fechaLimite, hoy),
          lte(accion.fechaLimite, HomeCountsQuery.addDays(hoy, HomeCountsQuery.WINDOW_DAYS)),
        ),
      )
      .orderBy(asc(accion.fechaLimite))
      .limit(ActivityFeedQuery.AGENDA_LIMIT);

    return {
      en_curso: running.map((row) => ({
        id: row.id,
        title: row.plantilla,
        description: `Líder: ${row.lider} · Método ${row.metodo.replace('_', ' ')}`,
        meta: row.fechaPlan ? `Plan del ${row.fechaPlan}` : 'Sin fecha de plan',
      })),
      agenda: due.map((row) => ({
        id: row.id,
        title: row.descripcion,
        description: row.limite ? `Vence el ${row.limite}` : 'Sin fecha límite',
        meta: row.estado,
      })),
    };
  }

  private static date(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}
