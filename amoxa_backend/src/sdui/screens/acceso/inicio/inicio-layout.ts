import type { RoleKey } from '@shared/roles.js';
import { RoleAccess } from '@auth-roles/role-access.js';

export interface InicioPrimaryAction {
  screenId: string;
  label: string;
}

export interface InicioFeedTitles {
  enCurso: string;
  enCursoVacio: string;
  enCursoDestino?: string;
  agenda: string;
  agendaVacia: string;
}

export class InicioLayout {
  private static readonly PRIMARY: Readonly<Record<string, InicioPrimaryAction>> = {
    superusuario: { screenId: 'usuario.crear', label: 'Crear usuario' },
    administrador: { screenId: 'solicitud.lista', label: 'Ver solicitudes' },
    direccion: { screenId: 'programa.aprobar', label: 'Revisar programa' },
    gestor: { screenId: 'programa.editar', label: 'Crear programa' },
    lider: { screenId: 'auditoria.lista', label: 'Mis auditorías' },
    auditor: { screenId: 'auditoria.lista', label: 'Mis auditorías' },
    dueno_proceso: { screenId: 'accion.lista', label: 'Mis acciones' },
  };

  public static primaryAction(role: RoleKey): InicioPrimaryAction | undefined {
    const action = InicioLayout.PRIMARY[role];
    return action !== undefined && RoleAccess.canSee(role, action.screenId) ? action : undefined;
  }

  public static titles(role: RoleKey): InicioFeedTitles {
    if (role === 'superusuario' || role === 'administrador') {
      return {
        enCurso: 'Solicitudes por revisar',
        enCursoVacio: 'No hay solicitudes de contraseña pendientes.',
        enCursoDestino: 'solicitud.lista',
        agenda: 'Actividad reciente',
        agendaVacia: 'Todavía no hay actividad registrada.',
      };
    }
    return {
      enCurso: 'Auditorías en curso',
      enCursoVacio: 'No tienes auditorías en curso.',
      enCursoDestino: RoleAccess.canSee(role, 'auditoria.lista') ? 'auditoria.lista' : undefined,
      agenda: 'Acciones por vencer',
      agendaVacia: 'No hay acciones por vencer en los próximos 7 días.',
    };
  }
}
