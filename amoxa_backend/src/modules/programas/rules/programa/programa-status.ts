import type { estadoProgramaAuditoriaEnum } from '@schemas/enums.js';

export type EstadoPrograma = (typeof estadoProgramaAuditoriaEnum.enumValues)[number];

export class ProgramaStatus {
  private static readonly LABELS: Record<EstadoPrograma, string> = {
    borrador: 'Borrador',
    pendiente_aprobacion: 'Pendiente de aprobación',
    devuelto: 'Devuelto',
    aprobado: 'Aprobado',
    en_ejecucion: 'En ejecución',
    cerrado: 'Cerrado',
  };

  public static label(estado: EstadoPrograma): string {
    return ProgramaStatus.LABELS[estado];
  }

  public static canEdit(estado: EstadoPrograma): boolean {
    return estado === 'borrador' || estado === 'devuelto';
  }

  public static canSend(estado: EstadoPrograma): boolean {
    return estado === 'borrador' || estado === 'devuelto';
  }

  public static canDecide(estado: EstadoPrograma): boolean {
    return estado === 'pendiente_aprobacion';
  }

  public static visibleToDireccion(estado: EstadoPrograma): boolean {
    return estado !== 'borrador';
  }
}
