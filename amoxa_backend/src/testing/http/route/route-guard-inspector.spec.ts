import { Controller, Get } from '@nestjs/common';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { RouteGuardInspector } from '@testing-http-route/route-guard-inspector.js';

@Controller('demo')
class DemoController {
  @Authorized.permissions('programa.aprobar')
  @Get('protegida')
  public protegida(): string {
    return 'ok';
  }

  @Authorized.anyPermission('programa.aprobar', 'programa.crear')
  @Get('alguna')
  public alguna(): string {
    return 'ok';
  }

  @Get('abierta')
  public abierta(): string {
    return 'ok';
  }
}

describe('RouteGuardInspector', () => {
  it('lista las rutas sin guardias de sesión y de rol existente', () => {
    expect(RouteGuardInspector.unprotected(DemoController)).toEqual(['abierta']);
  });

  it('reporta los guardias que protegen una ruta', () => {
    expect(RouteGuardInspector.guardsOf(DemoController, 'protegida')).toEqual([
      'JwtAuthGuard',
      'RoleExistsGuard',
      'PermissionsGuard',
    ]);
  });
});
