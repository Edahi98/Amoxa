import type { InformeEstado } from '@informes-rules-informe/informe.types.js';

export class InformeState {
  public static resolve(firmado: boolean, distribuido: boolean): InformeEstado {
    if (distribuido) {
      return 'distribuido';
    }
    return firmado ? 'firmado' : 'borrador';
  }
}
