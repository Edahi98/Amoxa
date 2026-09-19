import { ROLES } from '@shared/roles.js';
import { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { ScreenFactory } from '@sdui-definition-screen/screen-factory.js';
import { UsuarioScreenProvider } from '@usuarios-screens/usuario-screen.provider.js';
import { UsuariosHarness } from '@testing-usuarios/usuarios-harness.js';
import '@screens/index.js';

describe('tabla de usuarios', () => {
  let harness: UsuariosHarness;
  let provider: UsuarioScreenProvider;

  beforeAll(async () => {
    harness = await UsuariosHarness.create();
    provider = new UsuarioScreenProvider(harness.query);
    await harness.seedUser('superusuario');
    await harness.seedUser('auditor', { activo: false });
    await harness.seedUser('gestor_programa', { activo: false, withPassword: false });
  });

  afterAll(() => harness.close());

  const load = async () => {
    const superuser = await harness.seedUser('administrador');
    const result = await provider.load({ screenId: 'usuario.lista', user: harness.payload(superuser), role: 'superusuario' });
    return (result.data as { usuarios: Record<string, unknown>[] }).usuarios;
  };

  it('el servidor entrega una fila por usuario con las columnas de la tabla', async () => {
    const filas = await load();

    expect(filas.length).toBeGreaterThanOrEqual(4);
    for (const fila of filas) {
      expect(Object.keys(fila).sort()).toEqual(['email', 'estado', 'id', 'nombre', 'rol', 'ultimoAcceso']);
    }
  });

  it('el estado distingue activo, inactivo e invitación pendiente', async () => {
    const estados = new Set((await load()).map((fila) => fila.estado));

    expect(estados).toEqual(new Set(['Activo', 'Inactivo', 'Invitación pendiente']));
  });

  it('el rol llega con su nombre legible y nunca con la contraseña', async () => {
    const filas = await load();

    expect(filas.map((fila) => fila.rol)).toContain(ROLES.superusuario.label);
    expect(JSON.stringify(filas)).not.toContain('passwordHash');
  });

  it('la pantalla usa una tabla ordenable con una acción al abrir la fila', () => {
    const screen = ScreenFactory.createById('usuario.lista', ScreenContextBuilder.forUser({ id: 'u1', rol: 'superusuario' }));
    const tabla = JSON.stringify(screen.root);

    expect(tabla).toContain('"type":"table"');
    expect(tabla).toContain('"sortable":true');
    expect(tabla).toContain('"press":"abrir_usuario"');
    expect(screen.actions['abrir_usuario']?.type).toBe('navigate');
  });

  it('cada columna tiene clave, etiqueta y un tipo conocido', () => {
    const screen = ScreenFactory.createById('usuario.lista', ScreenContextBuilder.forUser({ id: 'u1', rol: 'superusuario' }));
    const columnas = (JSON.parse(JSON.stringify(screen.root)) as { children: { children: { type: string; props: { columns: { key: string; label: string; kind?: string }[] } }[] }[] }).children
      .flatMap((section) => section.children)
      .find((component) => component.type === 'table')!.props.columns;

    expect(columnas.map((columna) => columna.key)).toEqual(['nombre', 'email', 'rol', 'estado', 'ultimoAcceso']);
    for (const columna of columnas) {
      expect(columna.label).not.toBe('');
      expect(['text', 'badge', 'date', 'number']).toContain(columna.kind ?? 'text');
    }
  });
});
