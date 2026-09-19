import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import JSZip from 'jszip';
import { eq } from 'drizzle-orm';
import { auditLog } from '@schemas/index.js';
import { ROLES } from '@shared/roles.js';
import { ImageKind } from '@common-files/image-kind.js';
import { EncodedFileReader } from '@common-files/encoded-file-reader.js';
import { InformeAuditoriaDocument } from '@docx-informes/informe-auditoria.document.js';
import { SecurityLogService } from '@seguridad/security-log.service.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { InformeDraftService } from '@informes-services-informe/informe-draft.service.js';
import { InformeLoaderService } from '@informes-services-informe/informe-loader.service.js';
import { MarcaController } from '@marca-controllers/marca.controller.js';
import { MarcaService } from '@marca-services/marca.service.js';
import { MarcaGuardarSchema } from '@validators-marca/marca-guardar.schema.js';
import { AuditFlowSeed } from '@testing-database/audit-flow-seed.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TestSeed } from '@testing-database/test-seed.js';
import { TokenFactory } from '@testing-fakes/token-factory.js';
import { RouteGuardInspector } from '@testing-http-route/route-guard-inspector.js';
import { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { ScreenFactory } from '@sdui-definition-screen/screen-factory.js';
import '@screens/index.js';

vi.setConfig({ testTimeout: 60000 });

const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

class Files {
  public static png(name = 'logo.png') {
    return { nombre: name, tipo: 'image/png', tamano: 70, contenido: PNG_1X1 };
  }

  public static jpg(): Buffer {
    return Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x10, 0x00, 0x20, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9]);
  }
}

describe('marca del informe', () => {
  let database: TestDatabase;
  let marca: MarcaService;
  let orgId: string;
  let admin: ReturnType<typeof TokenFactory.of>;

  beforeAll(async () => {
    database = await TestDatabase.create();
    marca = new MarcaService(database.db, new SecurityLogService(database.db));
    orgId = await TestSeed.organizacion(database);
    admin = TokenFactory.of(await TestSeed.usuario(database, orgId, 'administrador'));
  });

  afterAll(() => database.close());

  describe('lectura de imágenes', () => {
    it('reconoce PNG y JPG por su firma y lee sus dimensiones', () => {
      const png = Buffer.from(PNG_1X1, 'base64');

      expect(ImageKind.detect(png)).toBe('png');
      expect(ImageKind.size(png, 'png')).toEqual({ width: 1, height: 1 });
      expect(ImageKind.detect(Files.jpg())).toBe('jpg');
      expect(ImageKind.size(Files.jpg(), 'jpg')).toEqual({ width: 32, height: 16 });
      expect(ImageKind.detect(Buffer.from('GIF89a'))).toBeUndefined();
      expect(ImageKind.detect(Buffer.from('<script>'))).toBeUndefined();
    });

    it('decodifica base64 válido y rechaza texto, vacío o demasiado grande', () => {
      expect(EncodedFileReader.decode({ contenido: PNG_1X1 }, 1024)).toHaveLength(Buffer.from(PNG_1X1, 'base64').length);
      expect(() => EncodedFileReader.decode({ contenido: 'no es base64!' }, 1024)).toThrow(BadRequestException);
      expect(() => EncodedFileReader.decode({ contenido: PNG_1X1 }, 10)).toThrow(PayloadTooLargeException);
    });
  });

  describe('guardar', () => {
    it('sin marca previa devuelve valores vacíos', async () => {
      expect(await marca.get(orgId)).toEqual({ color: '', pie: '', tieneLogo: false });
    });

    it('guarda color normalizado, pie y logotipo y lo deja en la bitácora', async () => {
      const view = await marca.save(orgId, { color: '1d4ed8', pie: 'Documento confidencial', logo: Files.png() }, admin, '5.5.5.5');

      expect(view).toEqual({ color: '#1D4ED8', pie: 'Documento confidencial', tieneLogo: true });
      const entries = await database.db.select().from(auditLog).where(eq(auditLog.action, 'brand.updated'));
      expect(entries.some((entry) => entry.actorId === admin.sub && entry.ip === '5.5.5.5')).toBe(true);
    });

    it('rechaza archivos que no son PNG o JPG aunque lleven esa extensión', async () => {
      const fake = { nombre: 'logo.png', tipo: 'image/png', tamano: 5, contenido: Buffer.from('<?xml version="1.0"?><svg/>').toString('base64') };

      await expect(marca.save(orgId, { logo: fake }, admin)).rejects.toThrow(BadRequestException);
    });

    it('un cambio de color no borra el logotipo', async () => {
      const view = await marca.save(orgId, { color: '#0F766E' }, admin);

      expect(view).toMatchObject({ color: '#0F766E', tieneLogo: true });
    });

    it('cada organización tiene su propia marca', async () => {
      const other = await TestSeed.organizacion(database, 'Otra');

      expect(await marca.get(other)).toEqual({ color: '', pie: '', tieneLogo: false });
      expect(await marca.forDocument(other)).toBeUndefined();
    });
  });

  describe('validación de la petición', () => {
    it('acepta los datos anidados bajo marca y valida el color', () => {
      expect(MarcaGuardarSchema.safeParse({ marca: { color: '#1D4ED8', pie: 'Pie' } }).success).toBe(true);
      expect(MarcaGuardarSchema.safeParse({ marca: { color: 'azul' } }).success).toBe(false);
      expect(MarcaGuardarSchema.safeParse({ marca: { color: '#12' } }).success).toBe(false);
    });

    it('rechaza pies con inyección de scripts o SQL', () => {
      expect(MarcaGuardarSchema.safeParse({ marca: { pie: '<script>alert(1)</script>' } }).success).toBe(false);
      expect(MarcaGuardarSchema.safeParse({ marca: { pie: "x'; DROP TABLE usuario;--" } }).success).toBe(false);
    });

    it('trata el logotipo vacío como sin cambio', () => {
      const parsed = MarcaGuardarSchema.parse({ marca: { color: '#1D4ED8', logo: null } }) as { logo?: unknown };

      expect(parsed.logo).toBeUndefined();
    });
  });

  describe('informe con marca', () => {
    it('el .docx lleva el logotipo, el color y el pie de la organización', async () => {
      const scenario = await AuditFlowSeed.create(database);
      const admin2 = TokenFactory.of(await TestSeed.usuario(database, scenario.organizacionId, 'administrador'));
      await marca.save(scenario.organizacionId, { color: '#0F766E', pie: 'Calidad · Uso interno', logo: Files.png() }, admin2);
      const loader = new InformeLoaderService(database.db);
      const drafts = new InformeDraftService(database.db, loader, new NotificationService(database.db), new RecordVersionService(database.db));
      const draft = await drafts.ensureFor(scenario.auditoriaId, scenario.organizacionId);
      const detail = await loader.detail(draft!.informeId, scenario.organizacionId);

      const file = await InformeAuditoriaDocument.build(detail, await marca.forDocument(scenario.organizacionId));

      const zip = await JSZip.loadAsync(file.buffer);
      const names = Object.keys(zip.files);
      expect(names.some((name) => name.startsWith('word/media/'))).toBe(true);
      const footer = await zip.file(names.find((name) => /word\/footer\d*\.xml$/.test(name))!)!.async('string');
      expect(footer).toContain('Calidad · Uso interno');
      const body = await zip.file('word/document.xml')!.async('string');
      expect(body).toContain('0F766E');
    });

    it('sin marca el informe conserva el color y el pie de siempre', async () => {
      const scenario = await AuditFlowSeed.create(database);
      const loader = new InformeLoaderService(database.db);
      const drafts = new InformeDraftService(database.db, loader, new NotificationService(database.db), new RecordVersionService(database.db));
      const detail = await loader.detail((await drafts.ensureFor(scenario.auditoriaId, scenario.organizacionId))!.informeId, scenario.organizacionId);

      const file = await InformeAuditoriaDocument.build(detail, await marca.forDocument(scenario.organizacionId));

      const zip = await JSZip.loadAsync(file.buffer);
      expect(Object.keys(zip.files).some((name) => name.startsWith('word/media/'))).toBe(false);
      expect(await zip.file('word/document.xml')!.async('string')).toContain('1D4ED8');
    });
  });

  describe('quitar el logotipo', () => {
    it('lo elimina y conserva el resto de la marca', async () => {
      const view = await marca.removeLogo(orgId, admin);

      expect(view.tieneLogo).toBe(false);
      expect(view.color).toBe('#0F766E');
      expect(await marca.forDocument(orgId)).toEqual({ color: '0F766E', footer: 'Documento confidencial' });
    });
  });

  describe('acceso', () => {
    it('todas las rutas exigen el permiso marca.editar', () => {
      for (const report of RouteGuardInspector.routes(MarcaController)) {
        expect(report.guards).toEqual(['JwtAuthGuard', 'RoleExistsGuard', 'PermissionsGuard']);
      }
      expect(RouteGuardInspector.routes(MarcaController)).toHaveLength(3);
    });

    it('solo el superusuario y el administrador tienen el permiso; los roles existentes no cambiaron', () => {
      const permitted = (Object.keys(ROLES) as (keyof typeof ROLES)[]).filter((role) => (ROLES[role].actions as readonly string[]).includes('marca.editar'));

      expect(permitted.sort()).toEqual(['administrador', 'superusuario']);
    });

    it('la pantalla ofrece color, pie, logotipo y guarda enviando los datos de la pantalla', () => {
      const screen = ScreenFactory.createById('marca.editar', ScreenContextBuilder.forUser({ id: 'u1', rol: 'administrador' }));
      const json = JSON.stringify(screen.root);

      expect(json).toContain('"type":"file_input"');
      expect(json).toContain('marca.color');
      expect(json).toContain('marca.pie');
      expect(screen.actions['guardar_marca']).toMatchObject({ type: 'call_api', method: 'PUT', endpoint: '/marca' });
      expect(screen.actions['guardar_marca'].payload).toBeUndefined();
    });
  });
});
