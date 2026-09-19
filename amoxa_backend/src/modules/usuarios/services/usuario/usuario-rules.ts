import { ForbiddenException } from '@nestjs/common';
import type { UsuarioRow } from '@usuarios-services-usuario/usuario-view.js';

export class UsuarioRules {
  public static assertNotSuperuser(target: Pick<UsuarioRow, 'rol'>): void {
    if (target.rol === 'superusuario') {
      throw new ForbiddenException('Operación no permitida sobre esta cuenta');
    }
  }
}
