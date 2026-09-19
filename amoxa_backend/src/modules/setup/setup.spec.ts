import { ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { auditLog, systemState, usuario } from '@schemas/index.js';
import { SecretToken } from '@common-security/secret-token.js';
import { SetupController } from '@setup-controllers/setup.controller.js';
import { SetupLockGuard } from '@setup-guards/setup-lock.guard.js';
import { UsuariosHarness } from '@testing-usuarios/usuarios-harness.js';
import { FakeExecutionContext } from '@testing-fakes/fake-execution-context.js';
import { RouteGuardInspector } from '@testing-http-route/route-guard-inspector.js';
import { SetupSchema } from '@validators-setup/setup.schema.js';

const validBody = {
  email: 'super@amoxa.test',
  nombre: 'Super Usuario',
  password: 'una-contrasena-larga-1',
  organizacion: 'Amoxa',
};

class LockContext {
  public static forPath(path: string) {
    const { context, request } = FakeExecutionContext.forUser(undefined, () => undefined, LockContext);
    Object.assign(request, { path });
    return context;
  }
}

describe('arranque del sistema', () => {
  let harness: UsuariosHarness;

  beforeEach(async () => {
    harness = await UsuariosHarness.create();
  });

  afterEach(() => harness.close());

  const state = async () => {
    const [row] = await harness.database.orm.select().from(systemState).where(eq(systemState.id, 1));
    return row;
  };

  it('sin superusuario genera un token de activación y guarda solo su hash', async () => {
    const result = await harness.bootstrap.prepare(undefined);

    expect(result.initialized).toBe(false);
    expect(result.generatedToken).toEqual(expect.any(String));
    const row = await state();
    expect(row.initialized).toBe(false);
    expect(row.setupTokenHash).toBe(SecretToken.hash(result.generatedToken!));
    expect(row.setupTokenHash).not.toContain(result.generatedToken!);
  });

  it('usa el token de la variable de entorno cuando está definida y no lo imprime', async () => {
    const result = await harness.bootstrap.prepare('token-desde-entorno');

    expect(result.generatedToken).toBeNull();
    expect((await state()).setupTokenHash).toBe(SecretToken.hash('token-desde-entorno'));
  });

  it('un token vacío en el entorno se ignora y se genera uno aleatorio', async () => {
    const result = await harness.bootstrap.prepare('');

    expect(result.generatedToken).toEqual(expect.any(String));
  });

  it('si la base ya tiene un superusuario marca el sistema como inicializado', async () => {
    await harness.seedUser('superusuario');

    const result = await harness.bootstrap.prepare(undefined);

    expect(result.initialized).toBe(true);
    expect((await state()).initialized).toBe(true);
    expect(await harness.initialization.isInitialized()).toBe(true);
  });

  it('los usuarios existentes conservan su rol tras el arranque', async () => {
    const existing = await harness.seedUser('auditor');

    await harness.bootstrap.prepare(undefined);

    expect((await harness.userRow(existing.id)).rol).toBe('auditor');
  });

  it('mantiene una sola fila en system_state aunque se arranque varias veces', async () => {
    await harness.bootstrap.prepare(undefined);
    await harness.bootstrap.prepare(undefined);

    expect(await harness.database.orm.select().from(systemState)).toHaveLength(1);
  });
});

describe('activación del sistema', () => {
  let harness: UsuariosHarness;
  let token: string;

  beforeEach(async () => {
    harness = await UsuariosHarness.create();
    token = (await harness.bootstrap.prepare(undefined)).generatedToken!;
  });

  afterEach(() => harness.close());

  const state = async () => {
    const [row] = await harness.database.orm.select().from(systemState);
    return row;
  };

  it('crea el superusuario, marca el sistema activo y borra el hash del token', async () => {
    const created = await harness.activation.activate({ ...validBody, setupToken: token }, '10.0.0.1');

    expect(created).toMatchObject({ email: validBody.email, rol: 'superusuario' });
    const row = await harness.userRow(created.id);
    expect(row.rol).toBe('superusuario');
    expect(row.activo).toBe(true);
    expect(row.passwordHash).not.toBe(validBody.password);
    const [stateRow] = await harness.database.orm.select().from(systemState);
    expect(stateRow).toMatchObject({ initialized: true, setupTokenHash: null });
    expect(await harness.initialization.isInitialized()).toBe(true);
  });

  it('registra la activación en la bitácora con la ip', async () => {
    const created = await harness.activation.activate({ ...validBody, setupToken: token }, '10.0.0.1');

    const [entry] = await harness.database.orm.select().from(auditLog);
    expect(entry).toMatchObject({ action: 'system.setup_activated', actorId: created.id, ip: '10.0.0.1' });
  });

  it('rechaza un token incorrecto y no crea nada', async () => {
    await expect(harness.activation.activate({ ...validBody, setupToken: 'incorrecto' }, null)).rejects.toThrow(ForbiddenException);

    expect(await harness.database.orm.select().from(usuario)).toHaveLength(0);
    expect((await state()).initialized).toBe(false);
  });

  it('una vez activado responde 404 para siempre, incluso con el token correcto', async () => {
    await harness.activation.activate({ ...validBody, setupToken: token }, null);

    await expect(
      harness.activation.activate({ ...validBody, email: 'otro@amoxa.test', setupToken: token }, null),
    ).rejects.toThrow(NotFoundException);
  });

  it('dos activaciones simultáneas producen un solo superusuario', async () => {
    const attempts = await Promise.allSettled([
      harness.activation.activate({ ...validBody, setupToken: token }, null),
      harness.activation.activate({ ...validBody, email: 'otro@amoxa.test', setupToken: token }, null),
    ]);

    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    const supers = await harness.database.orm.select().from(usuario).where(eq(usuario.rol, 'superusuario'));
    expect(supers).toHaveLength(1);
  });

  it('la base de datos impide un segundo superusuario aunque se salte el servicio', async () => {
    await harness.seedUser('superusuario');

    await expect(harness.seedUser('superusuario')).rejects.toThrow();
  });

  it('puede asociar el superusuario a una organización existente', async () => {
    const created = await harness.activation.activate(
      { email: validBody.email, nombre: validBody.nombre, password: validBody.password, organizacionId: harness.organizacionId, setupToken: token },
      null,
    );

    expect(created.organizacionId).toBe(harness.organizacionId);
  });

  it('el superusuario activado ya no aparece como asignable por http', () => {
    expect(SetupSchema.safeParse({ ...validBody, setupToken: token, rol: 'superusuario' }).success).toBe(false);
  });
});

describe('validación de la activación', () => {
  const body = { ...validBody, setupToken: 'token' };

  it('exige contraseña de al menos 12 caracteres', () => {
    expect(SetupSchema.safeParse({ ...body, password: 'corta-11-ch' }).success).toBe(false);
    expect(SetupSchema.safeParse({ ...body, password: 'exactamente-12' }).success).toBe(true);
  });

  it('rechaza cadenas con inyección SQL o scripts', () => {
    expect(SetupSchema.safeParse({ ...body, nombre: "x'; DROP TABLE usuario;--" }).success).toBe(false);
    expect(SetupSchema.safeParse({ ...body, nombre: '<script>alert(1)</script>' }).success).toBe(false);
  });

  it('exige indicar la organización, ya sea existente o nueva, pero no ambas', () => {
    const { organizacion: _omit, ...withoutOrg } = body;
    expect(SetupSchema.safeParse(withoutOrg).success).toBe(false);
    expect(SetupSchema.safeParse({ ...body, organizacionId: '5b6f1f9e-1c2a-4f5e-9a7b-3c1d2e4f5a6b' }).success).toBe(false);
  });
});

describe('bloqueo global mientras el sistema no está activo', () => {
  let harness: UsuariosHarness;
  let guard: SetupLockGuard;

  beforeEach(async () => {
    harness = await UsuariosHarness.create();
    await harness.bootstrap.prepare(undefined);
    guard = new SetupLockGuard(harness.initialization);
  });

  afterEach(() => harness.close());

  it('bloquea cualquier ruta que no sea /setup', async () => {
    await expect(guard.canActivate(LockContext.forPath('/auth/login'))).rejects.toThrow(ServiceUnavailableException);
    await expect(guard.canActivate(LockContext.forPath('/usuarios'))).rejects.toThrow(ServiceUnavailableException);
    await expect(guard.canActivate(LockContext.forPath('/setupfake'))).rejects.toThrow(ServiceUnavailableException);
  });

  it('deja pasar /setup y /setup/status', async () => {
    await expect(guard.canActivate(LockContext.forPath('/setup'))).resolves.toBe(true);
    await expect(guard.canActivate(LockContext.forPath('/setup/status'))).resolves.toBe(true);
  });

  it('libera todas las rutas cuando el sistema está inicializado', async () => {
    await harness.seedUser('superusuario');
    await harness.bootstrap.prepare(undefined);

    await expect(guard.canActivate(LockContext.forPath('/auth/login'))).resolves.toBe(true);
  });

  it('el estado público refleja si el sistema está inicializado', async () => {
    const controller = new SetupController(harness.initialization, harness.activation);

    expect(await controller.status()).toEqual({ initialized: false });
    await harness.seedUser('superusuario');
    await harness.bootstrap.prepare(undefined);
    expect(await controller.status()).toEqual({ initialized: true });
  });

  it('el controlador de activación es público y limitado por ip', () => {
    expect(RouteGuardInspector.guardsOf(SetupController, 'activate')).toEqual(['ThrottleGuard']);
    expect(RouteGuardInspector.guardsOf(SetupController, 'status')).toEqual([]);
  });
});
