import { ForbiddenException } from '@nestjs/common';

export class VerifierEligibility {
  public static isEligible(verificadorId: string, responsableId: string): boolean {
    return verificadorId !== responsableId;
  }

  public static assertEligible(verificadorId: string, responsableId: string): void {
    if (!VerifierEligibility.isEligible(verificadorId, responsableId)) {
      throw new ForbiddenException('No puede verificar una acción de la que usted es responsable.');
    }
  }
}
