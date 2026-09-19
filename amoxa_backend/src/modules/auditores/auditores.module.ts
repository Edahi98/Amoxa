import { Module } from '@nestjs/common';
import { AuthModule } from '@auth/auth.module.js';
import { NotificacionesModule } from '@notificaciones/notificaciones.module.js';
import { RegistrosModule } from '@registros/registros.module.js';
import { AuditoresController } from '@auditores-controllers/auditores.controller.js';
import { AuditorScreenDataProvider } from '@auditores-screens/auditor-screen-data.provider.js';
import { AuditorDocumentService } from '@auditores-services-auditor/auditor-document.service.js';
import { AuditorQueryService } from '@auditores-services-auditor/auditor-query.service.js';
import { AuditoresService } from '@auditores-services/auditores.service.js';

@Module({
  imports: [AuthModule, RegistrosModule, NotificacionesModule],
  controllers: [AuditoresController],
  providers: [AuditoresService, AuditorQueryService, AuditorDocumentService, AuditorScreenDataProvider],
  exports: [AuditorQueryService],
})
export class AuditoresModule {}
