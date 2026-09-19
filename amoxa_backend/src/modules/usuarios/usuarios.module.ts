import { Module } from '@nestjs/common';
import { AuthModule } from '@auth/auth.module.js';
import { SeguridadModule } from '@seguridad/seguridad.module.js';
import { SolicitudesClaveModule } from '@solicitudes-clave/solicitudes-clave.module.js';
import { MeController } from '@usuarios-controllers/me.controller.js';
import { UsuariosController } from '@usuarios-controllers/usuarios.controller.js';
import { UsuarioScreenProvider } from '@usuarios-screens/usuario-screen.provider.js';
import { UsuarioAdminService } from '@usuarios-services-usuario/usuario-admin.service.js';
import { UsuarioProfileService } from '@usuarios-services-usuario/usuario-profile.service.js';
import { UsuarioQueryService } from '@usuarios-services-usuario/usuario-query.service.js';

@Module({
  imports: [AuthModule, SeguridadModule, SolicitudesClaveModule],
  controllers: [UsuariosController, MeController],
  providers: [UsuarioQueryService, UsuarioAdminService, UsuarioProfileService, UsuarioScreenProvider],
})
export class UsuariosModule {}
