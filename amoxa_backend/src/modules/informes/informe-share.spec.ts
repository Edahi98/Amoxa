import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { auditLog, informeEnlace } from '@schemas/index.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { MarcaService } from '@marca-services/marca.service.js';
import { SecurityLogService } from '@seguridad/security-log.service.js';
import { CompartidoController } from '@informes/compartido.controller.js';
import { InformesController } from '@informes/informes.controller.js';
import { InformeDraftService } from '@informes-services-informe/informe-draft.service.js';
import { InformeLoaderService } from '@informes-services-informe/informe-loader.service.js';
import { InformeReadService } from '@informes-services-informe/informe-read.service.js';
import { InformeReviewService } from '@informes-services-informe/informe-review.service.js';
import { InformeShareService } from '@informes-services-informe/informe-share.service.js';
import { SecretToken } from '@common-security/secret-token.js';
import { DocxInspector } from '@testing-docx/docx-inspector.js';
import { AuditFlowSeed, type AuditScenario } from '@testing-database/audit-flow-seed.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TokenFactory } from '@testing-fakes/token-factory.js';
import { RouteGuardInspector } from '@testing-http-route/route-guard-inspector.js';

vi.setConfig({ testTimeout: 60000 });

describe('compartir informe por enlace', () => {
  let database: TestDatabase;
  let share: InformeShareService;
  let review: InformeReviewService;
  let scenario: AuditScenario;
  let informeId: string;

  const lider = () => TokenFactory.of(scenario.lider);
  const tokenOf = (url: string) => decodeURIComponent(url.split('/').pop()!);

  beforeAll(async () => {
    database = await TestDatabase.create();
    const notifications = new NotificationService(database.db);
    const versions = new RecordVersionService(database.db);
    const loader = new InformeLoaderService(database.db);
    const drafts = new InformeDraftService(database.db, loader, notifications, versions);
    const reader = new InformeReadService(database.db, loader, drafts, versions);
    share = new InformeShareService(database.db, reader, loader, new SecurityLogService(database.db), new MarcaService(database.db, new SecurityLogService(database.db)));
    review = new InformeReviewService(database.db, loader, versions);
    scenario = await AuditFlowSeed.create(database);
    informeId = (await drafts.ensureFor(scenario.auditoriaId, scenario.organizacionId))!.informeId;
    await review.updateConclusions(informeId, lider(), 'Conclusiones para compartir');
  }, 60000);

  afterAll(() => database.close());

  it('no permite compartir un borrador', async () => {
    await expect(share.create(informeId, lider(), 'lider')).rejects.toThrow(UnprocessableEntityException);
  });

  describe('con el informe firmado', () => {
    beforeAll(async () => {
      await review.sign(informeId, lider(), 'Ana Líder');
    }, 60000);

    it('genera un enlace de 7 días, guarda solo el hash y devuelve la url una vez', async () => {
      const now = new Date('2026-01-01T10:00:00.000Z');
      const link = await share.create(informeId, lider(), 'lider', 7, '9.9.9.9', now);

      const raw = tokenOf(link.enlaceUrl);
      expect(Buffer.from(raw, 'base64url')).toHaveLength(32);
      expect(link.enlaceUrl).toMatch(/\/compartido\/informes\//);
      expect(link.enlaceExpira.toISOString()).toBe('2026-01-08T10:00:00.000Z');
      const rows = await database.db.select().from(informeEnlace).where(eq(informeEnlace.informeId, informeId));
      expect(JSON.stringify(rows)).not.toContain(raw);
      expect(rows.some((row) => row.tokenHash === SecretToken.hash(raw))).toBe(true);
    });

    it('cualquiera con el enlace descarga el .docx sin sesión y queda registrado', async () => {
      const link = await share.create(informeId, lider(), 'lider');

      const file = await share.open(tokenOf(link.enlaceUrl), '8.8.8.8');

      expect(file.fileName).toContain('.docx');
      const text = await DocxInspector.text(file.buffer);
      expect(text).toContain('Informe de auditoría interna');
      expect(text).toContain('Conclusiones para compartir');
      const entries = await database.db.select().from(auditLog).where(eq(auditLog.action, 'report.link_opened'));
      expect(entries.some((entry) => entry.ip === '8.8.8.8')).toBe(true);
    });

    it('rechaza tokens inventados con un mensaje genérico', async () => {
      await expect(share.open(SecretToken.generate())).rejects.toThrow(NotFoundException);
      await expect(share.open('')).rejects.toThrow('Enlace no válido o vencido');
    });

    it('un enlace vencido deja de funcionar', async () => {
      const link = await share.create(informeId, lider(), 'lider', 1, null, new Date('2020-01-01T00:00:00.000Z'));

      await expect(share.open(tokenOf(link.enlaceUrl))).rejects.toThrow('Enlace no válido o vencido');
    });

    it('revocar deja sin efecto todos los enlaces activos', async () => {
      const first = await share.create(informeId, lider(), 'lider');
      const second = await share.create(informeId, lider(), 'lider');

      const result = await share.revokeAll(informeId, lider(), 'lider');

      expect(result.revocados).toBeGreaterThanOrEqual(2);
      await expect(share.open(tokenOf(first.enlaceUrl))).rejects.toThrow(NotFoundException);
      await expect(share.open(tokenOf(second.enlaceUrl))).rejects.toThrow(NotFoundException);
    });

    it('otra organización no puede crear ni revocar enlaces', async () => {
      const other = await AuditFlowSeed.create(database);
      const stranger = TokenFactory.of(other.lider);

      await expect(share.create(informeId, stranger, 'lider')).rejects.toThrow('Informe no encontrado');
      await expect(share.revokeAll(informeId, stranger, 'lider')).rejects.toThrow('Informe no encontrado');
    });

    it('registra la creación y la revocación con quién y desde dónde', async () => {
      await share.create(informeId, lider(), 'lider', 7, '7.7.7.7');
      await share.revokeAll(informeId, lider(), 'lider', '7.7.7.7');

      const entries = await database.db.select().from(auditLog).where(eq(auditLog.actorId, scenario.lider.id));
      expect(entries.map((entry) => entry.action)).toEqual(expect.arrayContaining(['report.link_created', 'report.link_revoked']));
    });
  });

  it('la ruta pública no exige sesión pero sí limita las peticiones por ip', () => {
    expect(RouteGuardInspector.guardsOf(CompartidoController, 'open')).toEqual(['ThrottleGuard']);
  });

  it('crear y revocar exigen el permiso de distribuir', () => {
    const guards = ['JwtAuthGuard', 'RoleExistsGuard', 'PermissionsGuard'];

    expect(RouteGuardInspector.guardsOf(InformesController, 'createLink')).toEqual(guards);
    expect(RouteGuardInspector.guardsOf(InformesController, 'revokeLinks')).toEqual(guards);
  });

  it('arma la url pública con la base configurada', () => {
    expect(InformeShareService.urlFor('a b', 'https://api.amoxa.test/')).toBe('https://api.amoxa.test/compartido/informes/a%20b');
  });
});
