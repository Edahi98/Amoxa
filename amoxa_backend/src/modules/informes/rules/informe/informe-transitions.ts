import { UnprocessableEntityException } from '@nestjs/common';
import type { InformeEstado } from '@informes-rules-informe/informe.types.js';

export class InformeTransitions {
  public static assertCanEditConclusions(estado: InformeEstado): void {
    if (estado !== 'borrador') {
      throw new UnprocessableEntityException(
        'El informe ya fue firmado y no se puede modificar. Solo un informe en borrador admite cambios en las conclusiones.',
      );
    }
  }

  public static assertCanSign(estado: InformeEstado, conclusiones: string | null): void {
    if (estado !== 'borrador') {
      throw new UnprocessableEntityException('Solo se puede firmar un informe en borrador.');
    }
    if (conclusiones === null || conclusiones.trim() === '') {
      throw new UnprocessableEntityException('Escriba las conclusiones del informe antes de firmarlo.');
    }
  }

  public static assertCanDistribute(estado: InformeEstado): void {
    if (estado === 'distribuido') {
      throw new UnprocessableEntityException('El informe ya fue distribuido y la auditoría está finalizada.');
    }
    if (estado !== 'firmado') {
      throw new UnprocessableEntityException('Solo se puede distribuir un informe firmado.');
    }
  }

  public static assertCanApprove(estado: InformeEstado): void {
    if (estado === 'borrador') {
      throw new UnprocessableEntityException('Solo se puede aprobar un informe firmado por el líder.');
    }
  }
}
