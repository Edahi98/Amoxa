import type { RoleKey } from '@shared/roles.js';
import type { ComponentBuilder } from '@sdui-builder/component-builder.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

export class InicioKpis {
  public static for(role: RoleKey): ComponentBuilder[] {
    if (role === 'superusuario') {
      return [
        InicioKpis.kpi('kpi_solicitudes', 'Solicitudes de contraseña', 'conteos.solicitudes_pendientes', 'key'),
        InicioKpis.kpi('kpi_invitaciones', 'Invitaciones sin usar', 'conteos.invitaciones_pendientes', 'paper-plane-tilt'),
        InicioKpis.kpi('kpi_usuarios', 'Usuarios activos', 'conteos.usuarios_activos', 'users'),
        InicioKpis.kpi('kpi_notificaciones', 'Notificaciones sin leer', 'conteos.notificaciones_sin_leer', 'bell'),
      ];
    }
    if (role === 'administrador') {
      return [
        InicioKpis.kpi('kpi_solicitudes', 'Solicitudes de contraseña', 'conteos.solicitudes_pendientes', 'key'),
        InicioKpis.kpi('kpi_notificaciones', 'Notificaciones sin leer', 'conteos.notificaciones_sin_leer', 'bell'),
      ];
    }
    return [
      InicioKpis.kpi('kpi_notificaciones', 'Notificaciones sin leer', 'conteos.notificaciones_sin_leer', 'bell'),
      InicioKpis.kpi('kpi_por_vencer', 'Acciones por vencer', 'conteos.acciones_por_vencer', 'list-bullets'),
      InicioKpis.kpi('kpi_en_curso', 'Auditorías en curso', 'conteos.auditorias_en_curso', 'clipboard-text'),
    ];
  }

  private static kpi(id: string, label: string, path: string, icon: string): ComponentBuilder {
    return UiKit.kpi(id, label, path).props({ icon });
  }
}
