import { Module } from '@nestjs/common';
import { AuthModule } from '@auth/auth.module.js';
import { NotificacionesModule } from '@notificaciones/notificaciones.module.js';
import { RegistrosModule } from '@registros/registros.module.js';
import { InformesController } from '@informes/informes.controller.js';
import { InformeScreenProvider } from '@informes-screens/informe-screen.provider.js';
import { InformeApprovalService } from '@informes-services-informe/informe-approval.service.js';
import { InformeDistributionService } from '@informes-services-informe/informe-distribution.service.js';
import { InformeDocumentService } from '@informes-services-informe/informe-document.service.js';
import { InformeDraftService } from '@informes-services-informe/informe-draft.service.js';
import { InformeEntityResolverService } from '@informes-services-informe/informe-entity-resolver.service.js';
import { InformeLoaderService } from '@informes-services-informe/informe-loader.service.js';
import { InformeReadService } from '@informes-services-informe/informe-read.service.js';
import { InformeReviewService } from '@informes-services-informe/informe-review.service.js';

@Module({
  imports: [AuthModule, NotificacionesModule, RegistrosModule],
  controllers: [InformesController],
  providers: [
    InformeLoaderService,
    InformeDraftService,
    InformeReviewService,
    InformeDistributionService,
    InformeReadService,
    InformeApprovalService,
    InformeDocumentService,
    InformeEntityResolverService,
    InformeScreenProvider,
  ],
  exports: [InformeDraftService],
})
export class InformesModule {}
