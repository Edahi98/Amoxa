import { UnprocessableEntityException } from '@nestjs/common';
import type { DestinatarioCandidato } from '@informes-rules-informe/informe.types.js';

export class DistributionRules {
  public static includesDirection(recipients: readonly DestinatarioCandidato[]): boolean {
    return recipients.some((recipient) => recipient.rol === 'admin');
  }

  public static assertValid(recipients: readonly DestinatarioCandidato[]): void {
    if (recipients.length === 0) {
      throw new UnprocessableEntityException('Elija al menos un destinatario para el informe.');
    }
    if (!DistributionRules.includesDirection(recipients)) {
      throw new UnprocessableEntityException(
        'El informe debe enviarse al menos a una persona de la alta dirección; agregue un destinatario de dirección.',
      );
    }
  }
}
