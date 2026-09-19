import { Module } from '@nestjs/common';
import { AuthModule } from '@auth/auth.module.js';
import { SeguridadModule } from '@seguridad/seguridad.module.js';
import { MarcaController } from '@marca-controllers/marca.controller.js';
import { MarcaScreenProvider } from '@marca-screens/marca-screen.provider.js';
import { MarcaService } from '@marca-services/marca.service.js';

@Module({
  imports: [AuthModule, SeguridadModule],
  controllers: [MarcaController],
  providers: [MarcaService, MarcaScreenProvider],
  exports: [MarcaService],
})
export class MarcaModule {}
