import { ROLES } from '@shared/roles.js';
import { ScreenCatalog } from '@sdui-kit/screen-catalog.js';
import { InicioMenuGroups } from '@screens-acceso-inicio/inicio-menu-groups.js';

describe('ScreenCatalog', () => {
  const screens = [...new Set(Object.values(ROLES).flatMap((role) => role.screens))].filter((id) => id !== 'acceso.login');

  it('toda pantalla de un rol tiene ícono y descripción propios', () => {
    for (const screenId of screens) {
      const entry = ScreenCatalog.of(screenId);
      expect(entry.icon, screenId).not.toBe('arrow-right');
      expect(entry.description, screenId).not.toBe('');
    }
  });

  it('una pantalla desconocida usa el ícono de respaldo', () => {
    expect(ScreenCatalog.of('desconocida.x')).toEqual({ icon: 'arrow-right', description: '' });
  });
});

describe('InicioMenuGroups', () => {
  it('agrupa las pantallas por área y oculta las que necesitan un registro elegido', () => {
    const groups = InicioMenuGroups.build(ROLES.administrador.screens.filter((id) => id !== 'inicio' && id !== 'acceso.login'));

    expect(groups.map((group) => group.title)).toEqual(['Administración', 'Mi cuenta']);
    expect(groups.flatMap((group) => group.screens)).not.toContain('usuario.editar');
  });

  it('ninguna pantalla queda fuera de un grupo con nombre', () => {
    for (const role of Object.values(ROLES)) {
      const groups = InicioMenuGroups.build(role.screens.filter((id) => id !== 'inicio' && id !== 'acceso.login'));
      expect(groups.map((group) => group.id)).not.toContain('otras');
    }
  });
});
