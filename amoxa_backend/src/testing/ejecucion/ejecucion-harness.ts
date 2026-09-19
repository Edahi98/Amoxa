import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import type { TestDatabase } from '@testing-database/test-database.js';
import { AuditoriaAccessService } from '@ejecucion-acceso-auditoria/auditoria-access.service.js';
import { AuditoriaResumenService } from '@ejecucion-acceso-auditoria/auditoria-resumen.service.js';
import { ChecklistService } from '@ejecucion-checklist/checklist.service.js';
import { EjecucionDocumentoService } from '@ejecucion-documentos/ejecucion-documento.service.js';
import { EvidenceService } from '@ejecucion-evidencia/evidence.service.js';
import { EvidenceStorage } from '@ejecucion-evidencia/evidence-storage.js';
import { HallazgoService } from '@ejecucion-hallazgos/hallazgo.service.js';
import { AperturaService } from '@ejecucion-reuniones-apertura/apertura.service.js';
import { CierreService } from '@ejecucion-reuniones-cierre/cierre.service.js';
import { ReunionService } from '@ejecucion-reuniones/reunion.service.js';

export class EjecucionHarness {
  public readonly access: AuditoriaAccessService;
  public readonly resumen: AuditoriaResumenService;
  public readonly versions: RecordVersionService;
  public readonly notifications: NotificationService;
  public readonly storage: EvidenceStorage;
  public readonly evidence: EvidenceService;
  public readonly checklist: ChecklistService;
  public readonly hallazgos: HallazgoService;
  public readonly reuniones: ReunionService;
  public readonly apertura: AperturaService;
  public readonly cierre: CierreService;
  public readonly documentos: EjecucionDocumentoService;

  constructor(database: TestDatabase, evidenceDir: string) {
    const db = database.db;
    this.access = new AuditoriaAccessService(db);
    this.resumen = new AuditoriaResumenService(db);
    this.versions = new RecordVersionService(db);
    this.notifications = new NotificationService(db);
    this.storage = new EvidenceStorage(evidenceDir);
    this.evidence = new EvidenceService(db, this.access, this.storage, this.versions);
    this.checklist = new ChecklistService(db, this.access, this.versions, this.evidence);
    this.hallazgos = new HallazgoService(db, this.access, this.versions);
    this.reuniones = new ReunionService(db, this.access, this.versions);
    this.apertura = new AperturaService(db, this.access, this.reuniones, this.versions, this.notifications);
    this.cierre = new CierreService(db, this.access, this.reuniones, this.hallazgos, this.versions, this.notifications);
    this.documentos = new EjecucionDocumentoService(this.access, this.resumen, this.checklist, this.hallazgos, this.reuniones);
  }
}
