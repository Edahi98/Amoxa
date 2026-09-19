import { Test } from '@nestjs/testing';
import { AppModule } from '@app/app.module.js';
import { DB } from '@db/db.module.js';
import { ThrottleGuard } from '@common-throttle/throttle.guard.js';
import { SetupController } from '@setup-controllers/setup.controller.js';
import { BootstrapTokenService } from '@setup-services/bootstrap-token.service.js';
import { RestablecimientoController } from '@solicitudes-controllers/restablecimiento.controller.js';
import { SolicitudesClaveController } from '@solicitudes-controllers/solicitudes-clave.controller.js';
import { SolicitudExpirationService } from '@solicitudes-services-solicitud/solicitud-expiration.service.js';
import { MeController } from '@usuarios-controllers/me.controller.js';
import { UsuariosController } from '@usuarios-controllers/usuarios.controller.js';

describe('AppModule', () => {
  it('resuelve la inyección de dependencias de los módulos de seguridad', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DB)
      .useValue({})
      .compile();

    for (const provider of [
      SetupController,
      UsuariosController,
      MeController,
      SolicitudesClaveController,
      RestablecimientoController,
      BootstrapTokenService,
      SolicitudExpirationService,
      ThrottleGuard,
    ]) {
      expect(moduleRef.get(provider as never, { strict: false })).toBeDefined();
    }
    await moduleRef.close();
  });
});
