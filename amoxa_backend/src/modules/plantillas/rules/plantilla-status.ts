import type { estadoPlantillaEnum } from '@schemas/enums.js';

export type EstadoPlantilla = (typeof estadoPlantillaEnum.enumValues)[number];

export class PlantillaStatus {
  private static readonly LABELS: Record<EstadoPlantilla, string> = {
    borrador: 'Borrador',
    publicada: 'Publicada',
    archivada: 'Archivada',
  };

  public static label(estado: EstadoPlantilla, vigente: boolean): string {
    return estado === 'publicada' && vigente ? 'Publicada (vigente)' : PlantillaStatus.LABELS[estado];
  }

  public static canEdit(estado: EstadoPlantilla): boolean {
    return estado === 'borrador';
  }

  public static canPublish(estado: EstadoPlantilla): boolean {
    return estado === 'borrador';
  }

  public static isEligible(estado: EstadoPlantilla, vigente: boolean): boolean {
    return estado === 'publicada' && vigente;
  }
}
