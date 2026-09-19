import { Module } from '@nestjs/common';
import { AuthModule } from '@auth/auth.module.js';
import { SeguridadModule } from '@seguridad/seguridad.module.js';
import { RestablecimientoController } from '@solicitudes-controllers/restablecimiento.controller.js';
import { SolicitudesClaveController } from '@solicitudes-controllers/solicitudes-clave.controller.js';
import { SolicitudScreenProvider } from '@solicitudes-screens/solicitud-screen.provider.js';
import { SolicitudCancellationService } from '@solicitudes-services-solicitud/solicitud-cancellation.service.js';
import { SolicitudDecisionService } from '@solicitudes-services-solicitud/solicitud-decision.service.js';
import { SolicitudExpirationService } from '@solicitudes-services-solicitud/solicitud-expiration.service.js';
import { SolicitudIssuerService } from '@solicitudes-services-solicitud/solicitud-issuer.service.js';
import { SolicitudQueryService } from '@solicitudes-services-solicitud/solicitud-query.service.js';
import { SolicitudRequestService } from '@solicitudes-services-solicitud/solicitud-request.service.js';
import { SolicitudResetService } from '@solicitudes-services-solicitud/solicitud-reset.service.js';

@Module({
  imports: [AuthModule, SeguridadModule],
  controllers: [SolicitudesClaveController, RestablecimientoController],
  providers: [
    SolicitudRequestService,
    SolicitudQueryService,
    SolicitudDecisionService,
    SolicitudIssuerService,
    SolicitudCancellationService,
    SolicitudResetService,
    SolicitudExpirationService,
    SolicitudScreenProvider,
  ],
  exports: [SolicitudIssuerService, SolicitudCancellationService],
})
export class SolicitudesClaveModule {}
