import { CriterioMapper } from '@plantillas-rules/criterio-mapper.js';
import { PlantillaStatus } from '@plantillas-rules/plantilla-status.js';
import { TemplateCoverage, type CoverageReport } from '@plantillas-rules/template-coverage.js';
import type {
  PlantillaDetail,
  PlantillaRow,
  PlantillaSummary,
  PlantillaView,
  PreguntaRow,
  PreguntaView,
  PropuestaDetail,
  PropuestaView,
} from '@plantillas-mappers-plantilla/plantilla-view.js';

export class PlantillaMapper {
  public static coverageOf(preguntas: readonly PreguntaRow[]): CoverageReport {
    return TemplateCoverage.evaluate(preguntas);
  }

  public static toView(detail: PlantillaDetail): PlantillaView {
    const { row } = detail;
    return {
      id: row.id,
      nombre: row.nombre,
      version: row.version,
      estado: row.estado,
      estado_etiqueta: PlantillaStatus.label(row.estado, row.vigente),
      vigente: row.vigente,
      publicada_en: row.publicadaEn?.toISOString() ?? null,
      preguntas: detail.preguntas.map((question) => PlantillaMapper.questionView(question)),
      propuestas: detail.propuestas.map((proposal) => PlantillaMapper.proposalView(proposal)),
      cobertura: PlantillaMapper.coverageOf(detail.preguntas),
    };
  }

  public static toSummary(row: PlantillaRow, preguntas: readonly PreguntaRow[]): PlantillaSummary {
    const coverage = PlantillaMapper.coverageOf(preguntas);
    return {
      id: row.id,
      nombre: row.nombre,
      version: row.version,
      estado: row.estado,
      estado_etiqueta: PlantillaStatus.label(row.estado, row.vigente),
      vigente: row.vigente,
      total_preguntas: preguntas.length,
      cobertura: { iso9001: coverage.iso9001, propios: coverage.propios },
    };
  }

  public static snapshot(detail: PlantillaDetail): Record<string, unknown> {
    return { ...PlantillaMapper.toView({ ...detail, propuestas: [] }) };
  }

  private static questionView(question: PreguntaRow): PreguntaView {
    return {
      id: question.id,
      orden: question.orden,
      texto: question.texto,
      clausula: question.clausulaRef,
      criterio: CriterioMapper.toView(question.tipoCriterio),
      criterio_etiqueta: CriterioMapper.label(question.tipoCriterio),
      tipo_respuesta: question.tipoRespuesta,
      evidencia_obligatoria: question.evidenciaObligatoria,
      title: `${question.orden}. ${question.texto}`,
      description: `Cláusula ${question.clausulaRef ?? 'sin indicar'} · ${CriterioMapper.label(question.tipoCriterio)}`,
    };
  }

  private static proposalView(proposal: PropuestaDetail): PropuestaView {
    const { row } = proposal;
    return {
      id: row.id,
      texto: row.texto,
      clausula: row.clausulaRef,
      criterio: CriterioMapper.toView(row.tipoCriterio),
      estado: row.estado,
      propuesta_por: proposal.propuestaPor,
      title: row.texto,
      description: `Propuesta de ${proposal.propuestaPor} · Cláusula ${row.clausulaRef ?? 'sin indicar'}`,
    };
  }
}
