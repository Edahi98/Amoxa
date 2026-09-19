import { DocxInspector } from '@testing-docx/docx-inspector.js';
import { ActaReunionDocument } from '@docx-ejecucion/acta-reunion.document.js';
import { ChecklistAplicadoDocument } from '@docx-ejecucion/checklist-aplicado.document.js';
import type { AuditoriaResumenDoc, HallazgoDoc } from '@docx-ejecucion/ejecucion-documento-data.js';
import { RegistroHallazgosDocument } from '@docx-ejecucion/registro-hallazgos.document.js';

const auditoria: AuditoriaResumenDoc = {
  titulo: 'Auditoría 2026 · Compras',
  lider: 'Laura Líder',
  metodo: 'In situ',
  fechaPlan: '2026-03-10',
  fechaReal: '2026-03-12',
  estado: 'en_curso',
  procesos: ['Compras'],
};

const hallazgos: HallazgoDoc[] = [
  {
    numero: 1,
    tipo: 'No conformidad mayor',
    proceso: 'Compras',
    clausula: '8.4',
    descripcion: 'No se evalúan los proveedores críticos',
    estado: 'abierto',
    evidencias: 2,
    evidenciasVerificadas: true,
    revisionArea: 'discrepa',
    comentarioRevision: 'El área no está de acuerdo',
    aceptacion: 'discrepa',
    motivoDiscrepancia: 'Existe evaluación anual',
  },
  {
    numero: 2,
    tipo: 'Observación',
    proceso: 'Compras',
    clausula: null,
    descripcion: 'Digitalizar el registro',
    estado: 'abierto',
    evidencias: 0,
    evidenciasVerificadas: false,
    revisionArea: 'aceptado',
    comentarioRevision: null,
    aceptacion: 'acepta',
    motivoDiscrepancia: null,
  },
];

describe('documentos de ejecución', () => {
  it('genera la lista de verificación aplicada con casillas, evidencias y firmas', async () => {
    const file = await ChecklistAplicadoDocument.build({
      organizacion: 'Amoxa Demo',
      auditoria,
      plantilla: 'Plantilla ISO 9001',
      progreso: { total: 2, respondidas: 1, avance: 50 },
      auditores: ['Ana Auditora'],
      preguntas: [
        {
          orden: 1,
          texto: 'La política de la calidad está disponible.',
          clausula: '5.2',
          criterio: 'Norma',
          resultado: 'NC',
          comentario: 'No está en recepción',
          verificada: true,
          evidencias: [{ nombre: 'foto.png', capturadoEn: '2026-03-10T10:00:00.000Z', ubicacion: '19.43000, -99.13000', sha256: 'a'.repeat(64), almacenado: true }],
        },
        { orden: 2, texto: 'Se controla la información.', clausula: null, criterio: 'Procedimiento propio', resultado: null, comentario: null, verificada: false, evidencias: [] },
      ],
    });
    const text = await DocxInspector.text(file.buffer);

    expect(file.fileName).toBe('lista-de-verificacion-aplicada.docx');
    expect(text).toContain('Lista de verificación aplicada');
    expect(text).toContain('1. La política de la calidad está disponible.');
    expect(text).toContain('☒ No conforme');
    expect(text).toContain('☐ Conforme');
    expect(text).toContain('No está en recepción');
    expect(text).toContain('a'.repeat(64));
    expect(text).toContain('19.43000, -99.13000');
    expect(text).toContain('Auditor');
    expect(text).toContain('Líder auditor');
    expect(text).toContain('1 de 2 preguntas respondidas (50%)');
    expect(await DocxInspector.headerText(file.buffer)).toContain('Amoxa Demo');
  });

  it('genera el acta de apertura con asistentes y sin sección de hallazgos', async () => {
    const file = await ActaReunionDocument.build({
      organizacion: 'Amoxa Demo',
      tipo: 'apertura',
      auditoria,
      registrada: true,
      dirigidaPor: 'Laura Líder',
      realizadaEn: '2026-03-12T09:30:00.000Z',
      notas: 'Se acordó el calendario',
      asistentes: [
        { nombre: 'Laura Líder', rol: 'Líder', rolReunion: 'preside', confirmadaEn: '2026-03-12T09:30:00.000Z' },
        { nombre: 'Ana Auditora', rol: 'Auditor', rolReunion: 'asiste', confirmadaEn: null },
      ],
      hallazgos: [],
    });
    const text = await DocxInspector.text(file.buffer);

    expect(file.fileName).toBe('acta-reunion-apertura.docx');
    expect(text).toContain('Acta de reunión de apertura');
    expect(text).toContain('Ana Auditora');
    expect(text).toContain('Se acordó el calendario');
    expect(text).toContain('Firma');
    expect(text).not.toContain('Hallazgos revisados');
  });

  it('genera el acta de cierre con aceptación y discrepancias', async () => {
    const file = await ActaReunionDocument.build({
      organizacion: 'Amoxa Demo',
      tipo: 'cierre',
      auditoria,
      registrada: false,
      dirigidaPor: null,
      realizadaEn: null,
      notas: null,
      asistentes: [],
      hallazgos,
    });
    const text = await DocxInspector.text(file.buffer);

    expect(file.fileName).toBe('acta-reunion-cierre.docx');
    expect(text).toContain('Acta de reunión de cierre');
    expect(text).toContain('Hallazgos revisados');
    expect(text).toContain('Discrepó');
    expect(text).toContain('Existe evaluación anual');
    expect(text).toContain('Aceptó');
    expect(text).toContain('Reunión aún no registrada');
  });

  it('genera el registro de hallazgos y no conformidades', async () => {
    const file = await RegistroHallazgosDocument.build({ organizacion: 'Amoxa Demo', auditoria, hallazgos });
    const text = await DocxInspector.text(file.buffer);

    expect(file.fileName).toBe('registro-de-hallazgos.docx');
    expect(text).toContain('Registro de hallazgos y no conformidades');
    expect(text).toContain('Hallazgo 1: No conformidad mayor');
    expect(text).toContain('No se evalúan los proveedores críticos');
    expect(text).toContain('2 archivo(s), verificadas');
    expect(text).toContain('Existe evaluación anual');
    expect(text).toContain('No conformidades');
  });

  it('indica cuando no hay hallazgos', async () => {
    const file = await RegistroHallazgosDocument.build({ organizacion: 'Amoxa Demo', auditoria, hallazgos: [] });

    expect(await DocxInspector.text(file.buffer)).toContain('La auditoría no registra hallazgos.');
  });
});
