import type { RawEntity, RawOffline } from '@sdui-builder/raw-json.types.js';
import type { AuditoriaContext } from '@ejecucion-acceso-auditoria/auditoria-context.js';
import type { AuditoriaResumen } from '@ejecucion-acceso-auditoria/auditoria-resumen.service.js';

export class ExecutionScreenData {
  public static readonly OFFLINE: RawOffline = { enabled: true, cache_ttl_seconds: 86400, conflict_policy: 'manual' };

  private static readonly ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  public static isId(value: string | undefined): value is string {
    return value !== undefined && ExecutionScreenData.ID_PATTERN.test(value);
  }

  public static entity(context: AuditoriaContext, version = 1): RawEntity {
    return { type: 'auditoria', id: context.auditoria.id, version, estado: context.auditoria.estado };
  }

  public static auditCard(resumen: AuditoriaResumen): Record<string, unknown> {
    return {
      id: resumen.id,
      title: resumen.titulo,
      scope: resumen.procesos.map((item) => item.nombre).join(', '),
      method: resumen.metodoClave,
      startDate: resumen.fechaPlan ?? undefined,
      endDate: resumen.fechaReal ?? undefined,
      status: resumen.estado,
      leader: resumen.lider,
    };
  }

  public static truncate(text: string, max = 90): string {
    return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
  }
}
