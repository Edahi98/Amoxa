import { Injectable } from '@nestjs/common';
import type { DocxFile } from '@docx/docx-file.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { ActaReunionDocument } from '@docx-ejecucion/acta-reunion.document.js';
import { ChecklistAplicadoDocument } from '@docx-ejecucion/checklist-aplicado.document.js';
import type { AuditoriaResumenDoc, HallazgoDoc } from '@docx-ejecucion/ejecucion-documento-data.js';
import { RegistroHallazgosDocument } from '@docx-ejecucion/registro-hallazgos.document.js';
import { AuditoriaAccessService } from '@ejecucion-acceso-auditoria/auditoria-access.service.js';
import { AuditoriaResumenService, type AuditoriaResumen } from '@ejecucion-acceso-auditoria/auditoria-resumen.service.js';
import { ChecklistService } from '@ejecucion-checklist/checklist.service.js';
import { HallazgoService } from '@ejecucion-hallazgos/hallazgo.service.js';
import { ChecklistMapper } from '@ejecucion-reglas-checklist/checklist-mapper.js';
import { FindingRules } from '@ejecucion-reglas/finding-rules.js';
import { ReunionService, type ReunionTipo } from '@ejecucion-reuniones/reunion.service.js';
import type { HallazgoView } from '@ejecucion-hallazgos/hallazgo-view.js';

@Injectable()
export class EjecucionDocumentoService {
  private static readonly ROLES: Readonly<Record<string, string>> = {
    admin: 'Alta dirección',
    gestor_programa: 'Gestor',
    lider_auditor: 'Líder',
    auditor: 'Auditor',
    auditado: 'Dueño de proceso',
  };

  constructor(
    private readonly access: AuditoriaAccessService,
    private readonly resumen: AuditoriaResumenService,
    private readonly checklist: ChecklistService,
    private readonly hallazgos: HallazgoService,
    private readonly reuniones: ReunionService,
  ) {}

  public async checklistDocument(auditoriaId: string, user: TokenPayload): Promise<DocxFile> {
    const context = await this.access.loadAsMember(auditoriaId, user);
    const summary = await this.resumen.of(context);
    const view = await this.checklist.build(context);
    const auditors = new Set<string>();
    const names = await this.userNames(view.preguntas.flatMap((item) => (item.respuesta === null ? [] : [item.respuesta.auditorId])));
    for (const item of view.preguntas) {
      if (item.respuesta !== null) {
        auditors.add(names.get(item.respuesta.auditorId) ?? 'Auditor');
      }
    }
    return ChecklistAplicadoDocument.build({
      organizacion: summary.organizacion,
      auditoria: this.summaryDoc(summary),
      plantilla: summary.plantilla,
      progreso: {
        total: view.progreso.total,
        respondidas: view.progreso.respondidas,
        avance: view.progreso.avance,
      },
      auditores: [...auditors],
      preguntas: view.preguntas.map((item) => ({
        orden: item.orden,
        texto: item.texto,
        clausula: item.clausula,
        criterio: item.criterio === 'norma' ? 'Norma' : 'Procedimiento propio',
        resultado:
          item.respuesta === null ? null : (ChecklistMapper.toDb(item.respuesta.result) ?? null),
        comentario: item.respuesta?.comment ?? null,
        verificada: item.respuesta?.verificada ?? false,
        evidencias: (item.respuesta?.evidencias ?? []).map((file) => ({
          nombre: file.name,
          capturadoEn: file.capturedAt,
          ubicacion:
            file.latitude === undefined || file.longitude === undefined
              ? null
              : `${file.latitude.toFixed(5)}, ${file.longitude.toFixed(5)}`,
          sha256: file.sha256,
          almacenado: file.almacenado,
        })),
      })),
    });
  }

  public async actaDocument(auditoriaId: string, tipo: ReunionTipo, user: TokenPayload): Promise<DocxFile> {
    const context = await this.access.loadAsMember(auditoriaId, user);
    const summary = await this.resumen.of(context);
    const meeting = await this.reuniones.viewOf(context, tipo);
    const findings = tipo === 'cierre' ? await this.hallazgos.build(context) : [];
    return ActaReunionDocument.build({
      organizacion: summary.organizacion,
      tipo,
      auditoria: this.summaryDoc(summary),
      registrada: meeting.registrada,
      dirigidaPor: meeting.dirigidaPor,
      realizadaEn: meeting.realizadaEn,
      notas: meeting.notas,
      asistentes: meeting.asistentes.map((item) => ({
        nombre: item.nombre,
        rol: EjecucionDocumentoService.ROLES[item.rolUsuario] ?? item.rolUsuario,
        rolReunion: item.rolReunion,
        confirmadaEn: item.confirmadaEn,
      })),
      hallazgos: findings.map((item, index) => this.findingDoc(item, index + 1)),
    });
  }

  public async hallazgosDocument(auditoriaId: string, user: TokenPayload): Promise<DocxFile> {
    const context = await this.access.loadAsMember(auditoriaId, user);
    const summary = await this.resumen.of(context);
    const findings = await this.hallazgos.build(context);
    return RegistroHallazgosDocument.build({
      organizacion: summary.organizacion,
      auditoria: this.summaryDoc(summary),
      hallazgos: findings.map((item, index) => this.findingDoc(item, index + 1)),
    });
  }

  private findingDoc(item: HallazgoView, numero: number): HallazgoDoc {
    const owner = item.aceptaciones.at(-1);
    const closing = item.revisiones.filter((review) => review.momento === 'cierre').at(-1);
    return {
      numero,
      tipo: FindingRules.label(item.kind),
      proceso: item.proceso,
      clausula: item.clausula,
      descripcion: item.descripcion,
      estado: item.estado,
      evidencias: item.evidenciaCount,
      evidenciasVerificadas: item.evidenciasVerificadas,
      revisionArea: item.resultadoArea,
      comentarioRevision: closing?.comentario ?? null,
      aceptacion: owner === undefined ? 'pendiente' : owner.acepta ? 'acepta' : 'discrepa',
      motivoDiscrepancia: owner !== undefined && !owner.acepta ? owner.motivo : null,
    };
  }

  private summaryDoc(summary: AuditoriaResumen): AuditoriaResumenDoc {
    return {
      titulo: summary.titulo,
      lider: summary.lider,
      metodo: summary.metodo,
      fechaPlan: summary.fechaPlan,
      fechaReal: summary.fechaReal,
      estado: summary.estado,
      procesos: summary.procesos.map((item) => item.nombre),
    };
  }

  private async userNames(ids: readonly string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    const names = new Map<string, string>();
    if (unique.length === 0) {
      return names;
    }
    const rows = await this.resumen.namesOf(unique);
    for (const row of rows) {
      names.set(row.id, row.nombre);
    }
    return names;
  }
}
