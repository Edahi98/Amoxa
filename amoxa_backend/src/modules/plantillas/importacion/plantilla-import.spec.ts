import { BadRequestException } from '@nestjs/common';
import JSZip from 'jszip';
import { eq } from 'drizzle-orm';
import { pregunta, propuestaPregunta } from '@db/schema/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { ImportarBodySchema, type ImportarBody } from '@validators-plantillas/importar-body.schema.js';
import { PlantillaBodySchema } from '@validators-plantillas/plantilla-body.schema.js';
import { PlantillaQueryService } from '@plantillas-services-plantilla/plantilla-query.service.js';
import { PlantillasService } from '@plantillas-services/plantillas.service.js';
import { PlantillaImportService } from '@plantillas-importacion/plantilla-import.service.js';
import { DocumentTextExtractor } from '@plantillas-importacion/document-text-extractor.js';
import { QuestionHeuristics } from '@plantillas-importacion/question-heuristics.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { TestSeed, type SeededUser } from '@testing-database/test-seed.js';

vi.setConfig({ testTimeout: 60000 });

class Samples {
  public static async docx(paragraphs: string[]): Promise<Buffer> {
    const zip = new JSZip();
    const body = paragraphs.map((text) => `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`).join('');
    zip.file('word/document.xml', `<?xml version="1.0"?><w:document><w:body>${body}</w:body></w:document>`);
    return zip.generateAsync({ type: 'nodebuffer' });
  }

  public static async xlsx(rows: string[][]): Promise<Buffer> {
    const zip = new JSZip();
    const strings: string[] = [];
    const sheet = rows
      .map((cells, index) => {
        const xml = cells
          .map((cell) => {
            strings.push(cell);
            return `<c t="s"><v>${strings.length - 1}</v></c>`;
          })
          .join('');
        return `<row r="${index + 1}">${xml}</row>`;
      })
      .join('');
    zip.file('xl/workbook.xml', '<workbook/>');
    zip.file('xl/sharedStrings.xml', `<sst>${strings.map((text) => `<si><t>${text}</t></si>`).join('')}</sst>`);
    zip.file('xl/worksheets/sheet1.xml', `<worksheet><sheetData>${sheet}</sheetData></worksheet>`);
    return zip.generateAsync({ type: 'nodebuffer' });
  }

  public static encoded(name: string, data: Buffer) {
    return { nombre: name, tipo: '', tamano: data.length, contenido: data.toString('base64') };
  }
}

const token = (user: SeededUser): TokenPayload => ({
  sub: user.id,
  organizacionId: user.organizacionId,
  email: `${user.rol}@amoxa.test`,
  rol: user.rol,
  issuedAt: '2026-01-01T00:00:00.000Z',
});

const body = (archivo: unknown, clausula = '9.2', criterio = 'norma'): ImportarBody =>
  ImportarBodySchema.parse({ importar: { archivo, clausula, criterio } }) as ImportarBody;

describe('importación de preguntas', () => {
  describe('heurística', () => {
    it('quita viñetas y numeración, detecta la cláusula y descarta encabezados y duplicados', () => {
      const found = QuestionHeuristics.from([
        'LISTA DE VERIFICACIÓN INTERNA',
        '9.2.1 ¿Se planificó el programa de auditoría interna?',
        '• ¿Existen registros de la competencia de los auditores?',
        'a) ¿Se comunicaron los resultados a la dirección?',
        '¿Se planificó el programa de auditoría interna?',
        'Corto',
        '....... 12',
      ]);

      expect(found).toEqual([
        { texto: '¿Se planificó el programa de auditoría interna?', clausula: '9.2.1' },
        { texto: '¿Existen registros de la competencia de los auditores?', clausula: null },
        { texto: '¿Se comunicaron los resultados a la dirección?', clausula: null },
      ]);
    });

    it('descarta líneas con patrones de inyección y limita la cantidad', () => {
      expect(QuestionHeuristics.from(['<script>alert(1)</script> hola mundo cuatro', "x'; DROP TABLE usuario; --"])).toEqual([]);
      const many = Array.from({ length: 300 }, (_, index) => `¿La pregunta número ${index} está documentada?`);

      expect(QuestionHeuristics.from(many)).toHaveLength(QuestionHeuristics.MAX_QUESTIONS);
    });
  });

  describe('lectura de archivos', () => {
    it('lee los párrafos de un .docx con entidades y acentos', async () => {
      const lines = await DocumentTextExtractor.lines(await Samples.docx(['¿Se cumple &amp; documenta el requisito?', 'Otra línea']));

      expect(lines).toEqual(['¿Se cumple & documenta el requisito?', 'Otra línea']);
    });

    it('lee la celda más larga de cada fila de un .xlsx', async () => {
      const lines = await DocumentTextExtractor.lines(await Samples.xlsx([['1', '¿Se revisó el alcance del sistema?', 'Sí'], ['2', 'Otra pregunta de la lista']]));

      expect(lines).toEqual(['¿Se revisó el alcance del sistema?', 'Otra pregunta de la lista']);
    });

    it('rechaza archivos que no son .docx, .xlsx ni .pdf', async () => {
      await expect(DocumentTextExtractor.lines(Buffer.from('MZ ejecutable'))).rejects.toThrow(BadRequestException);
      const zip = new JSZip();
      zip.file('otro.txt', 'x');

      await expect(DocumentTextExtractor.lines(await zip.generateAsync({ type: 'nodebuffer' }))).rejects.toThrow(BadRequestException);
      await expect(DocumentTextExtractor.lines(Buffer.concat([Buffer.from('%PDF-'), Buffer.from('roto')]))).rejects.toThrow(BadRequestException);
    });
  });

  describe('servicio', () => {
    let database: TestDatabase;
    let plantillas: PlantillasService;
    let importer: PlantillaImportService;
    let gestor: TokenPayload;
    let plantillaId: string;

    beforeAll(async () => {
      database = await TestDatabase.create();
      const organizacionId = await TestSeed.organizacion(database);
      gestor = token(await TestSeed.usuario(database, organizacionId, 'gestor_programa'));
      const query = new PlantillaQueryService(database.db);
      plantillas = new PlantillasService(database.db, query, new RecordVersionService(database.db), new NotificationService(database.db));
      importer = new PlantillaImportService(database.db, query, plantillas);
      plantillaId = (await plantillas.create(gestor, PlantillaBodySchema.parse({ plantilla: { nombre: 'Importada' } }) as { nombre: string })).id;
    }, 60000);

    afterAll(() => database.close());

    it('crea propuestas pendientes con la cláusula detectada o la de omisión', async () => {
      const file = await Samples.docx(['9.3 ¿La dirección revisa el sistema de gestión?', '¿Se registran las no conformidades detectadas?']);

      const result = await importer.import(plantillaId, gestor, 'gestor', body(Samples.encoded('lista.docx', file), '9.2'));

      expect(result).toEqual({ importadas: 2 });
      const rows = await database.db.select().from(propuestaPregunta).where(eq(propuestaPregunta.plantillaId, plantillaId));
      expect(rows.map((row) => [row.clausulaRef, row.estado, row.propuestaPorId])).toEqual(
        expect.arrayContaining([
          ['9.3', 'pendiente', gestor.sub],
          ['9.2', 'pendiente', gestor.sub],
        ]),
      );
    });

    it('un archivo sin preguntas legibles se rechaza sin crear nada', async () => {
      const before = await database.db.select().from(propuestaPregunta).where(eq(propuestaPregunta.plantillaId, plantillaId));

      await expect(importer.import(plantillaId, gestor, 'gestor', body(Samples.encoded('vacia.docx', await Samples.docx(['Hola'])))))
        .rejects.toThrow('No se encontraron preguntas');
      expect(await database.db.select().from(propuestaPregunta).where(eq(propuestaPregunta.plantillaId, plantillaId))).toHaveLength(before.length);
    });

    it('otra organización no encuentra la plantilla', async () => {
      const other = token(await TestSeed.usuario(database, await TestSeed.organizacion(database, 'Otra'), 'gestor_programa'));
      const file = await Samples.docx(['¿Se planificó el programa de auditoría interna?']);

      await expect(importer.import(plantillaId, other, 'gestor', body(Samples.encoded('a.docx', file)))).rejects.toThrow();
    });

    it('aceptar todas convierte las propuestas en preguntas y rechazar todas las descarta', async () => {
      const accepted = await importer.resolveAll(plantillaId, gestor, 'aceptar');

      expect(accepted.resueltas).toBe(2);
      expect(await database.db.select().from(pregunta).where(eq(pregunta.plantillaId, plantillaId))).toHaveLength(2);
      await importer.import(plantillaId, gestor, 'gestor', body(Samples.encoded('b.xlsx', await Samples.xlsx([['1', '¿Se conservan los informes de auditoría?']]))));

      const rejected = await importer.resolveAll(plantillaId, gestor, 'rechazar');

      expect(rejected.resueltas).toBe(1);
      expect(await database.db.select().from(pregunta).where(eq(pregunta.plantillaId, plantillaId))).toHaveLength(2);
    });
  });

  describe('validación de la petición', () => {
    it('exige archivo, cláusula segura y criterio válido', () => {
      const archivo = { nombre: 'a.docx', contenido: 'AAAA' };

      expect(ImportarBodySchema.safeParse({ importar: { archivo, clausula: '9.2', criterio: 'norma' } }).success).toBe(true);
      expect(ImportarBodySchema.safeParse({ importar: { clausula: '9.2', criterio: 'norma' } }).success).toBe(false);
      expect(ImportarBodySchema.safeParse({ importar: { archivo, clausula: "9.2'; --", criterio: 'norma' } }).success).toBe(false);
      expect(ImportarBodySchema.safeParse({ importar: { archivo, clausula: '9.2', criterio: 'otro' } }).success).toBe(false);
    });
  });
});
