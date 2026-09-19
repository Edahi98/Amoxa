import { ROLES } from '@shared/roles.js';
import { RoleAccess } from '@auth-roles/role-access.js';
import { ScreenRegistry } from '@sdui-registry/screen-registry.js';
import '@screens/index.js';

describe('cobertura de pantallas', () => {
  const declaradas = [...new Set(Object.values(ROLES).flatMap((role) => role.screens))].sort();

  it('toda pantalla de ROLES tiene una definición registrada', () => {
    for (const screenId of declaradas) {
      expect(ScreenRegistry.findByScreenId(screenId), screenId).toBeDefined();
    }
  });

  it('toda definición registrada está en ROLES y no se repite', () => {
    const registradas = ScreenRegistry.screenIds();

    expect(new Set(registradas).size).toBe(registradas.length);
    expect([...registradas].sort()).toEqual([...declaradas, ...RoleAccess.SHARED_SCREENS].sort());
    expect(registradas).toHaveLength(41);
  });
});
