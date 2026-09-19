import { Module } from '@nestjs/common';
import { AuthModule } from '@auth/auth.module.js';
import { NotificacionesModule } from '@notificaciones/notificaciones.module.js';
import { RegistrosModule } from '@registros/registros.module.js';
import { AuditoriaAccessService } from '@ejecucion-acceso-auditoria/auditoria-access.service.js';
import { AuditoriaResumenService } from '@ejecucion-acceso-auditoria/auditoria-resumen.service.js';
import { ChecklistController } from '@ejecucion-checklist/checklist.controller.js';
import { ChecklistScreenProvider } from '@ejecucion-checklist/checklist-screen.provider.js';
import { ChecklistService } from '@ejecucion-checklist/checklist.service.js';
import { EjecucionDocumentoService } from '@ejecucion-documentos/ejecucion-documento.service.js';
import { EVIDENCE_DIR } from '@ejecucion-evidencia/evidence-dir.token.js';
import { EvidenceDirectory } from '@ejecucion-evidencia/evidence-directory.js';
import { EvidenceService } from '@ejecucion-evidencia/evidence.service.js';
import { EvidenceStorage } from '@ejecucion-evidencia/evidence-storage.js';
import { EvidenciaScreenProvider } from '@ejecucion-evidencia/evidencia-screen.provider.js';
import { EvidenciasController } from '@ejecucion-evidencia/evidencias.controller.js';
import { HallazgoRevisionController } from '@ejecucion-hallazgos/hallazgo-revision.controller.js';
import { HallazgoScreenProvider } from '@ejecucion-hallazgos/hallazgo-screen.provider.js';
import { HallazgoService } from '@ejecucion-hallazgos/hallazgo.service.js';
import { HallazgosController } from '@ejecucion-hallazgos/hallazgos.controller.js';
import { AperturaController } from '@ejecucion-reuniones-apertura/apertura.controller.js';
import { AperturaScreenProvider } from '@ejecucion-reuniones-apertura/apertura-screen.provider.js';
import { AperturaService } from '@ejecucion-reuniones-apertura/apertura.service.js';
import { CierreController } from '@ejecucion-reuniones-cierre/cierre.controller.js';
import { CierreScreenProvider } from '@ejecucion-reuniones-cierre/cierre-screen.provider.js';
import { CierreService } from '@ejecucion-reuniones-cierre/cierre.service.js';
import { ReunionService } from '@ejecucion-reuniones/reunion.service.js';
import { ReunionesController } from '@ejecucion-reuniones/reuniones.controller.js';

@Module({
  imports: [AuthModule, RegistrosModule, NotificacionesModule],
  controllers: [
    ChecklistController,
    EvidenciasController,
    HallazgosController,
    HallazgoRevisionController,
    AperturaController,
    CierreController,
    ReunionesController,
  ],
  providers: [
    { provide: EVIDENCE_DIR, useFactory: () => EvidenceDirectory.resolve() },
    AuditoriaAccessService,
    AuditoriaResumenService,
    EvidenceStorage,
    EvidenceService,
    ChecklistService,
    HallazgoService,
    ReunionService,
    AperturaService,
    CierreService,
    EjecucionDocumentoService,
    AperturaScreenProvider,
    ChecklistScreenProvider,
    EvidenciaScreenProvider,
    HallazgoScreenProvider,
    CierreScreenProvider,
  ],
  exports: [AuditoriaAccessService, ChecklistService, HallazgoService, ReunionService],
})
export class EjecucionModule {}
