import { Module } from '@nestjs/common';
import { AuthModule } from '@auth/auth.module.js';
import { NotificacionesModule } from '@notificaciones/notificaciones.module.js';
import { RegistrosModule } from '@registros/registros.module.js';
import { AuditoriasController } from '@auditorias-controllers/auditorias.controller.js';
import { ProgramaAuditoriasController } from '@auditorias-controllers/programa-auditorias.controller.js';
import { AuditoriaAlcanceProvider } from '@auditorias-providers-auditoria/auditoria-alcance-provider.js';
import { AuditoriaContactoProvider } from '@auditorias-providers-auditoria/auditoria-contacto-provider.js';
import { AuditoriaEquipoProvider } from '@auditorias-providers-auditoria/auditoria-equipo-provider.js';
import { AuditoriaListaProvider } from '@auditorias-providers-auditoria/auditoria-lista-provider.js';
import { AuditoriaPlanAprobarProvider } from '@auditorias-providers-auditoria/auditoria-plan-aprobar-provider.js';
import { AuditoriaPlanProvider } from '@auditorias-providers-auditoria/auditoria-plan-provider.js';
import { AlcanceService } from '@auditorias-services/alcance-service.js';
import { AuditoriaAccess } from '@auditorias-services-auditoria/auditoria-access.js';
import { AuditoriaCreator } from '@auditorias-services-auditoria/auditoria-creator.js';
import { AuditoriaDocuments } from '@auditorias-services-auditoria/auditoria-documents.js';
import { AuditoriaReader } from '@auditorias-services-auditoria/auditoria-reader.js';
import { AuditoriaRecorder } from '@auditorias-services-auditoria/auditoria-recorder.js';
import { ContactoService } from '@auditorias-services/contacto-service.js';
import { EquipoService } from '@auditorias-services/equipo-service.js';
import { PlanService } from '@auditorias-services/plan-service.js';

@Module({
  imports: [AuthModule, RegistrosModule, NotificacionesModule],
  controllers: [AuditoriasController, ProgramaAuditoriasController],
  providers: [
    AuditoriaReader,
    AuditoriaAccess,
    AuditoriaRecorder,
    AuditoriaCreator,
    AlcanceService,
    ContactoService,
    EquipoService,
    PlanService,
    AuditoriaDocuments,
    AuditoriaListaProvider,
    AuditoriaAlcanceProvider,
    AuditoriaContactoProvider,
    AuditoriaEquipoProvider,
    AuditoriaPlanProvider,
    AuditoriaPlanAprobarProvider,
  ],
  exports: [AuditoriaReader, AuditoriaAccess],
})
export class AuditoriasModule {}
