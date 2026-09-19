import { RoleMapper } from '@auth-roles/role-mapper.js';
import type { TokenPayload } from '@auth-token/token-payload.js';

describe('RoleMapper', () => {
  it.each([
    ['admin', 'direccion'],
    ['gestor_programa', 'gestor'],
    ['lider_auditor', 'lider'],
    ['auditor', 'auditor'],
    ['auditado', 'dueno_proceso'],
  ] as const)('traduce %s a %s', (dbRole, sessionRole) => {
    expect(RoleMapper.toSessionRole(dbRole)).toBe(sessionRole);
  });

  it('arma el usuario del contrato desde el token', () => {
    const payload: TokenPayload = {
      sub: 'u-1',
      organizacionId: 'o-1',
      email: 'ana@amoxa.test',
      rol: 'auditado',
      issuedAt: '2026-01-01T00:00:00.000Z',
    };

    expect(RoleMapper.toRawUser(payload)).toEqual({ id: 'u-1', nombre: 'ana@amoxa.test', rol: 'dueno_proceso' });
  });
});
