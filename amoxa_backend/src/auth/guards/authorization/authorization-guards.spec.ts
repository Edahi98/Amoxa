import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '@auth-guards-authorization/permissions.guard.js';
import { RolesGuard } from '@auth-guards-authorization/roles.guard.js';
import { RequestRole } from '@auth-roles/request-role.js';
import { ScreenAccessGuard } from '@sdui-guards/screen-access.guard.js';
import { FakeExecutionContext } from '@testing-fakes/fake-execution-context.js';
import { AuthorizationSample } from '@testing/authorization-sample.js';
import type { Request } from 'express';
import '@screens/index.js';

describe('RequestRole', () => {
  it('traduce el rol de la base de datos al rol del diagrama', () => {
    expect(RequestRole.resolve({ user: { rol: 'gestor_programa' } } as unknown as Request)).toBe('gestor');
  });

  it('rechaza cuando no hay usuario o el rol es desconocido', () => {
    expect(() => RequestRole.resolve({} as Request)).toThrow(ForbiddenException);
    expect(() => RequestRole.resolve({ user: { rol: 'fantasma' } } as unknown as Request)).toThrow(ForbiddenException);
  });
});

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());
  const proto = AuthorizationSample.prototype;

  it('permite los roles declarados y rechaza los demás', () => {
    expect(guard.canActivate(FakeExecutionContext.forRole('gestor_programa', proto.soloGestionYLider, AuthorizationSample))).toBe(true);
    expect(guard.canActivate(FakeExecutionContext.forRole('lider_auditor', proto.soloGestionYLider, AuthorizationSample))).toBe(true);
    expect(() => guard.canActivate(FakeExecutionContext.forRole('auditor', proto.soloGestionYLider, AuthorizationSample))).toThrow(ForbiddenException);
  });

  it('deja pasar rutas sin @Roles', () => {
    expect(guard.canActivate(FakeExecutionContext.forRole('auditor', proto.libre, AuthorizationSample))).toBe(true);
  });

  it('rechaza cuando la ruta exige rol y no hay usuario', () => {
    expect(() => guard.canActivate(FakeExecutionContext.forRole(undefined, proto.soloGestionYLider, AuthorizationSample))).toThrow(ForbiddenException);
  });
});

describe('PermissionsGuard', () => {
  const guard = new PermissionsGuard(new Reflector());
  const proto = AuthorizationSample.prototype;

  it('permite al rol que tiene el permiso y rechaza al que no', () => {
    expect(guard.canActivate(FakeExecutionContext.forRole('admin', proto.aprobar, AuthorizationSample))).toBe(true);
    expect(() => guard.canActivate(FakeExecutionContext.forRole('auditor', proto.aprobar, AuthorizationSample))).toThrow(ForbiddenException);
  });

  it('exige todos los permisos declarados', () => {
    expect(() => guard.canActivate(FakeExecutionContext.forRole('admin', proto.ambos, AuthorizationSample))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(FakeExecutionContext.forRole('gestor_programa', proto.ambos, AuthorizationSample))).toThrow(ForbiddenException);
  });

  it('deja pasar rutas sin @PermissionsDecorator', () => {
    expect(guard.canActivate(FakeExecutionContext.forRole('auditor', proto.libre, AuthorizationSample))).toBe(true);
  });
});

describe('ScreenAccessGuard', () => {
  const guard = new ScreenAccessGuard();
  const proto = AuthorizationSample.prototype;

  it('permite la pantalla que el rol puede ver', () => {
    expect(guard.canActivate(FakeExecutionContext.forRole('admin', proto.libre, AuthorizationSample, { screenId: 'programa.aprobar' }))).toBe(true);
  });

  it('rechaza la pantalla que el rol no puede ver', () => {
    expect(() => guard.canActivate(FakeExecutionContext.forRole('auditor', proto.libre, AuthorizationSample, { screenId: 'programa.aprobar' }))).toThrow(
      ForbiddenException,
    );
  });

  it('deja que el controlador responda 404 cuando la pantalla no existe', () => {
    expect(guard.canActivate(FakeExecutionContext.forRole('auditor', proto.libre, AuthorizationSample, { screenId: 'no.existe' }))).toBe(true);
  });
});
