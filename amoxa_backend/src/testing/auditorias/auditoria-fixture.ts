import { eq } from 'drizzle-orm';
import { auditor, plantillaChecklist, proceso, programaAuditoria, usuario } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TestSeed, type SeededUser } from '@testing-database/test-seed.js';
import type { AuditoriaDetalle } from '@auditorias-types/auditoria-detalle.js';
import { AlcanceService } from '@auditorias-services/alcance-service.js';
import { AuditoriaAccess } from '@auditorias-services-auditoria/auditoria-access.js';
import { AuditoriaCreator } from '@auditorias-services-auditoria/auditoria-creator.js';
import { AuditoriaDocuments } from '@auditorias-services-auditoria/auditoria-documents.js';
import { AuditoriaReader } from '@auditorias-services-auditoria/auditoria-reader.js';
import { AuditoriaRecorder } from '@auditorias-services-auditoria/auditoria-recorder.js';
import { ContactoService } from '@auditorias-services/contacto-service.js';
import { EquipoService } from '@auditorias-services/equipo-service.js';
import { PlanService } from '@auditorias-services/plan-service.js';

export class AuditoriaFixture {
  public readonly reader: AuditoriaReader;
  public readonly access: AuditoriaAccess;
  public readonly recorder: AuditoriaRecorder;
  public readonly versions: RecordVersionService;
  public readonly notifications: NotificationService;
  public readonly creator: AuditoriaCreator;
  public readonly alcance: AlcanceService;
  public readonly contacto: ContactoService;
  public readonly equipo: EquipoService;
  public readonly plan: PlanService;
  public readonly documents: AuditoriaDocuments;

  public organizacionId = '';
  public otraOrganizacionId = '';
  public gestor!: SeededUser;
  public lider!: SeededUser;
  public otroLider!: SeededUser;
  public auditorA!: SeededUser;
  public auditorB!: SeededUser;
  public auditorVencido!: SeededUser;
  public auditorNoApto!: SeededUser;
  public auditorFormacion!: SeededUser;
  public auditado!: SeededUser;
  public auditadoAjeno!: SeededUser;
  public gestorAjeno!: SeededUser;
  public procesoCompras = '';
  public procesoVentas = '';
  public programaId = '';
  public programaBorradorId = '';
  public plantillaId = '';
  public plantillaObsoletaId = '';

  private constructor(public readonly database: TestDatabase) {
    const db = database.db;
    this.reader = new AuditoriaReader(db);
    this.access = new AuditoriaAccess(this.reader);
    this.versions = new RecordVersionService(db);
    this.recorder = new AuditoriaRecorder(this.reader, this.versions);
    this.notifications = new NotificationService(db);
    this.creator = new AuditoriaCreator(db, this.recorder, this.notifications);
    this.alcance = new AlcanceService(db, this.access, this.recorder, this.notifications);
    this.contacto = new ContactoService(db, this.access, this.recorder, this.notifications);
    this.equipo = new EquipoService(db, this.access, this.recorder, this.versions, this.notifications);
    this.plan = new PlanService(db, this.access, this.recorder, this.notifications);
    this.documents = new AuditoriaDocuments(db, this.access);
  }

  public static async create(): Promise<AuditoriaFixture> {
    const fixture = new AuditoriaFixture(await TestDatabase.create());
    await fixture.seed();
    return fixture;
  }

  public token(seeded: SeededUser): TokenPayload {
    return {
      sub: seeded.id,
      organizacionId: seeded.organizacionId,
      email: `${seeded.id}@amoxa.test`,
      rol: seeded.rol,
      issuedAt: '2026-01-01T00:00:00.000Z',
    };
  }

  public async createAudit(procesoIds: string[] = [this.procesoCompras]): Promise<AuditoriaDetalle> {
    return this.creator.create(
      this.programaId,
      { plantillaId: this.plantillaId, liderId: this.lider.id, procesoIds, metodo: 'mixto', criterios: ['9.2'], fechaPlan: '2026-11-10' },
      this.token(this.gestor),
    );
  }

  public async close(): Promise<void> {
    await this.database.close();
  }

  private async seed(): Promise<void> {
    const database = this.database;
    this.organizacionId = await TestSeed.organizacion(database, 'Amoxa Demo');
    this.otraOrganizacionId = await TestSeed.organizacion(database, 'Otra organización');
    this.gestor = await TestSeed.usuario(database, this.organizacionId, 'gestor_programa');
    this.lider = await TestSeed.usuario(database, this.organizacionId, 'lider_auditor');
    this.otroLider = await TestSeed.usuario(database, this.organizacionId, 'lider_auditor');
    this.auditorA = await TestSeed.usuario(database, this.organizacionId, 'auditor');
    this.auditorB = await TestSeed.usuario(database, this.organizacionId, 'auditor');
    this.auditorVencido = await TestSeed.usuario(database, this.organizacionId, 'auditor');
    this.auditorNoApto = await TestSeed.usuario(database, this.organizacionId, 'auditor');
    this.auditorFormacion = await TestSeed.usuario(database, this.organizacionId, 'auditor');
    this.auditado = await TestSeed.usuario(database, this.organizacionId, 'auditado');
    this.auditadoAjeno = await TestSeed.usuario(database, this.organizacionId, 'auditado');
    this.gestorAjeno = await TestSeed.usuario(database, this.otraOrganizacionId, 'gestor_programa');

    const names: [SeededUser, string][] = [
      [this.lider, 'Laura Lider'],
      [this.otroLider, 'Otto Lider'],
      [this.auditorA, 'Ana Auditora'],
      [this.auditorB, 'Beto Auditor'],
      [this.auditorVencido, 'Vera Vencida'],
      [this.auditorNoApto, 'Nico NoApto'],
      [this.auditorFormacion, 'Fabi Formacion'],
      [this.auditado, 'Dario Dueno'],
      [this.auditadoAjeno, 'Vicky Ventas'],
    ];
    for (const [seeded, nombre] of names) {
      await database.orm.update(usuario).set({ nombre }).where(eq(usuario.id, seeded.id));
    }

    const [compras] = await database.orm
      .insert(proceso)
      .values({ organizacionId: this.organizacionId, nombre: 'Compras', duenoUsuarioId: this.auditado.id, importancia: 'alta', nivelRiesgo: 3 })
      .returning({ id: proceso.id });
    const [ventas] = await database.orm
      .insert(proceso)
      .values({ organizacionId: this.organizacionId, nombre: 'Ventas', duenoUsuarioId: this.auditadoAjeno.id, importancia: 'media', nivelRiesgo: 2 })
      .returning({ id: proceso.id });
    this.procesoCompras = compras.id;
    this.procesoVentas = ventas.id;
    await database.orm.update(usuario).set({ procesoId: this.procesoCompras }).where(eq(usuario.id, this.auditado.id));
    await database.orm.update(usuario).set({ procesoId: this.procesoCompras }).where(eq(usuario.id, this.auditorB.id));
    await database.orm.update(usuario).set({ procesoId: this.procesoVentas }).where(eq(usuario.id, this.auditadoAjeno.id));

    await database.orm.insert(auditor).values([
      { usuarioId: this.auditorA.id, estado: 'apto', vigenciaHasta: '2099-12-31' },
      { usuarioId: this.auditorB.id, estado: 'apto', vigenciaHasta: '2099-12-31' },
      { usuarioId: this.auditorVencido.id, estado: 'apto', vigenciaHasta: '2020-01-01' },
      { usuarioId: this.auditorNoApto.id, estado: 'no_apto', vigenciaHasta: '2099-12-31' },
      { usuarioId: this.auditorFormacion.id, estado: 'formacion', vigenciaHasta: null },
    ]);

    const [programa] = await database.orm
      .insert(programaAuditoria)
      .values({ organizacionId: this.organizacionId, periodo: '2026', estado: 'aprobado' })
      .returning({ id: programaAuditoria.id });
    const [borrador] = await database.orm
      .insert(programaAuditoria)
      .values({ organizacionId: this.organizacionId, periodo: '2027', estado: 'borrador' })
      .returning({ id: programaAuditoria.id });
    this.programaId = programa.id;
    this.programaBorradorId = borrador.id;

    const [vigente] = await database.orm
      .insert(plantillaChecklist)
      .values({ nombre: 'Checklist ISO 9001', vigente: true })
      .returning({ id: plantillaChecklist.id });
    const [obsoleta] = await database.orm
      .insert(plantillaChecklist)
      .values({ nombre: 'Checklist anterior', vigente: false })
      .returning({ id: plantillaChecklist.id });
    this.plantillaId = vigente.id;
    this.plantillaObsoletaId = obsoleta.id;
  }
}
