import { Module } from '@nestjs/common';
import { AuthModule } from '@auth/auth.module.js';
import { NotificacionesModule } from '@notificaciones/notificaciones.module.js';
import { RegistrosModule } from '@registros/registros.module.js';
import { AdminCountsQuery } from '@seguimiento-acceso/admin-counts.query.js';
import { ActivityFeedQuery } from '@seguimiento-acceso/activity-feed.query.js';
import { HomeCountsQuery } from '@seguimiento-acceso/home-counts.query.js';
import { InicioDataProvider } from '@seguimiento-acceso/inicio-data.provider.js';
import { LoginDataProvider } from '@seguimiento-acceso/login-data.provider.js';
import { DashboardDataProvider } from '@seguimiento-indicadores/dashboard-data.provider.js';
import { IndicatorQuery } from '@seguimiento-indicadores-indicator/indicator-query.js';
import { IndicatorsController } from '@seguimiento-indicadores-indicators/indicators.controller.js';
import { IndicatorsReportService } from '@seguimiento-indicadores-indicators/indicators-report.service.js';
import { IndicatorsService } from '@seguimiento-indicadores-indicators/indicators.service.js';
import { ProgramLoader } from '@seguimiento-revision-program/program-loader.js';
import { ProgramReviewController } from '@seguimiento-revision-program/program-review.controller.js';
import { ProgramReviewService } from '@seguimiento-revision-program/program-review.service.js';
import { ReviewMinutesService } from '@seguimiento-revision-review/review-minutes.service.js';
import { RevisionDireccionController } from '@seguimiento-revision/revision-direccion.controller.js';
import { RevisionDireccionDataProvider } from '@seguimiento-revision/revision-direccion-data.provider.js';
import { RevisionDireccionService } from '@seguimiento-revision/revision-direccion.service.js';
import { RevisionProgramaDataProvider } from '@seguimiento-revision/revision-programa-data.provider.js';

@Module({
  imports: [AuthModule, RegistrosModule, NotificacionesModule],
  controllers: [IndicatorsController, RevisionDireccionController, ProgramReviewController],
  providers: [
    IndicatorQuery,
    IndicatorsService,
    IndicatorsReportService,
    ProgramLoader,
    RevisionDireccionService,
    ProgramReviewService,
    ReviewMinutesService,
    HomeCountsQuery,
    AdminCountsQuery,
    ActivityFeedQuery,
    DashboardDataProvider,
    RevisionDireccionDataProvider,
    RevisionProgramaDataProvider,
    InicioDataProvider,
    LoginDataProvider,
  ],
})
export class SeguimientoModule {}
