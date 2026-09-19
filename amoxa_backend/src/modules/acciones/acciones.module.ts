import { Module } from '@nestjs/common';
import { AuthModule } from '@auth/auth.module.js';
import { NotificacionesModule } from '@notificaciones/notificaciones.module.js';
import { RegistrosModule } from '@registros/registros.module.js';
import { AccionesController } from '@acciones/acciones.controller.js';
import { AccionScreenProvider } from '@acciones-screens/accion-screen.provider.js';
import { AccionClosureService } from '@acciones-services-accion/accion-closure.service.js';
import { AccionCreationService } from '@acciones-services-accion/accion-creation.service.js';
import { AccionDocumentService } from '@acciones-services-accion/accion-document.service.js';
import { AccionHallazgoLookupService } from '@acciones-services-accion/accion-hallazgo-lookup.service.js';
import { AccionLoaderService } from '@acciones-services-accion/accion-loader.service.js';
import { AccionQueryService } from '@acciones-services-accion/accion-query.service.js';
import { AccionVerificationService } from '@acciones-services-accion/accion-verification.service.js';
import { ExpirationAlertService } from '@acciones-services-expiration/expiration-alert.service.js';
import { ExpirationTimerService } from '@acciones-services-expiration/expiration-timer.service.js';

@Module({
  imports: [AuthModule, NotificacionesModule, RegistrosModule],
  controllers: [AccionesController],
  providers: [
    AccionLoaderService,
    AccionQueryService,
    AccionCreationService,
    AccionClosureService,
    AccionVerificationService,
    AccionDocumentService,
    AccionHallazgoLookupService,
    ExpirationAlertService,
    ExpirationTimerService,
    AccionScreenProvider,
  ],
  exports: [ExpirationAlertService],
})
export class AccionesModule {}
