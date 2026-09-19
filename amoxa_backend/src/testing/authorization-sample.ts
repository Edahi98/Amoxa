import { PermissionsDecorator } from '@auth-decorators/permissions.decorator.js';
import { RolesDecorator } from '@auth-decorators/roles.decorator.js';

export class AuthorizationSample {
  @RolesDecorator.of('gestor', 'lider')
  public soloGestionYLider(): void {}

  @PermissionsDecorator.of('programa.aprobar')
  public aprobar(): void {}

  @PermissionsDecorator.of('programa.aprobar', 'programa.crear')
  public ambos(): void {}

  public libre(): void {}
}
