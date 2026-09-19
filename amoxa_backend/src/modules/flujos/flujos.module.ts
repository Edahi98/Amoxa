import { Module } from '@nestjs/common';
import { AuthModule } from '@auth/auth.module.js';
import { FlujosController } from '@flujos-controllers/flujos.controller.js';
import { FlujoScreenProvider } from '@flujos-screens/flujo-screen.provider.js';
import { NavegacionScreenProvider } from '@flujos-screens/navegacion-screen.provider.js';
import { MenuBloqueoService } from '@flujos-services-flujo/menu-bloqueo.service.js';
import { FlujoInstanceService } from '@flujos-services-flujo/flujo-instance.service.js';
import { FlujoProgressService } from '@flujos-services-flujo/flujo-progress.service.js';

@Module({
  imports: [AuthModule],
  controllers: [FlujosController],
  providers: [FlujoProgressService, FlujoInstanceService, MenuBloqueoService, FlujoScreenProvider, NavegacionScreenProvider],
})
export class FlujosModule {}
