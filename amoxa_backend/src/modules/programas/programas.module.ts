import { Module } from '@nestjs/common';
import { AuthModule } from '@auth/auth.module.js';
import { NotificacionesModule } from '@notificaciones/notificaciones.module.js';
import { RegistrosModule } from '@registros/registros.module.js';
import { ProgramasController } from '@programas-controllers/programas.controller.js';
import { ProgramaScreenDataProvider } from '@programas-screens/programa-screen-data.provider.js';
import { ProgramaDocumentService } from '@programas-services-programa/programa-document.service.js';
import { ProgramaQueryService } from '@programas-services-programa/programa-query.service.js';
import { ProgramasService } from '@programas-services/programas.service.js';

@Module({
  imports: [AuthModule, RegistrosModule, NotificacionesModule],
  controllers: [ProgramasController],
  providers: [ProgramasService, ProgramaQueryService, ProgramaDocumentService, ProgramaScreenDataProvider],
  exports: [ProgramaQueryService],
})
export class ProgramasModule {}
