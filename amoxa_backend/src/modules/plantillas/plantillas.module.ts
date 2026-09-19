import { Module } from '@nestjs/common';
import { AuthModule } from '@auth/auth.module.js';
import { NotificacionesModule } from '@notificaciones/notificaciones.module.js';
import { RegistrosModule } from '@registros/registros.module.js';
import { PlantillasController } from '@plantillas-controllers/plantillas.controller.js';
import { PlantillaScreenDataProvider } from '@plantillas-screens/plantilla-screen-data.provider.js';
import { PlantillaDocumentService } from '@plantillas-services-plantilla/plantilla-document.service.js';
import { PlantillaQueryService } from '@plantillas-services-plantilla/plantilla-query.service.js';
import { PlantillasService } from '@plantillas-services/plantillas.service.js';

@Module({
  imports: [AuthModule, RegistrosModule, NotificacionesModule],
  controllers: [PlantillasController],
  providers: [PlantillasService, PlantillaQueryService, PlantillaDocumentService, PlantillaScreenDataProvider],
  exports: [PlantillaQueryService],
})
export class PlantillasModule {}
