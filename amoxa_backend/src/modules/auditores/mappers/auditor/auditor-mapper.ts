import { AuditorAptitude } from '@auditores-rules-auditor/auditor-aptitude.js';
import { MethodCatalog } from '@auditores-rules/method-catalog.js';
import { SpecialtyParser } from '@auditores-rules/specialty-parser.js';
import type {
  AuditorRecord,
  AuditorSummary,
  AuditorView,
  EvaluacionRecord,
  EvaluacionView,
} from '@auditores-mappers-auditor/auditor-view.js';

export class AuditorMapper {
  public static toSummary(record: AuditorRecord, today: string = AuditorAptitude.today()): AuditorSummary {
    const estado = record.estado ?? 'formacion';
    const apto = AuditorAptitude.describe(estado, record.vigenciaHasta, today);
    return {
      id: record.id,
      nombre: record.nombre,
      email: record.email,
      rol: record.rol,
      estado,
      estado_etiqueta: AuditorAptitude.stateLabel(estado),
      apto,
      vigente: AuditorAptitude.isCurrentlyApto(estado, record.vigenciaHasta, today),
      vigencia_hasta: record.vigenciaHasta,
      title: record.nombre,
      description: apto,
      status: AuditorAptitude.stateLabel(estado),
    };
  }

  public static toView(
    record: AuditorRecord,
    evaluaciones: readonly EvaluacionRecord[],
    today: string = AuditorAptitude.today(),
  ): AuditorView {
    return {
      ...AuditorMapper.toSummary(record, today),
      formacion: record.formacion,
      experiencia: record.experiencia,
      especialidades: SpecialtyParser.join(record.disciplinas),
      disciplinas: record.disciplinas ?? [],
      evaluaciones: evaluaciones.map((entry) => AuditorMapper.evaluationView(entry, today)),
    };
  }

  public static evaluationView(record: EvaluacionRecord, today: string = AuditorAptitude.today()): EvaluacionView {
    return {
      id: record.id,
      fecha: record.fecha,
      resultado: record.resultado,
      resultado_etiqueta: record.resultado === 'satisfactorio' ? 'Satisfactorio' : 'No satisfactorio',
      metodos: record.metodos,
      metodos_etiquetas: record.metodos.map((method) => MethodCatalog.label(method)),
      observaciones: record.observaciones,
      evaluador: record.evaluador,
      estado_resultante: AuditorAptitude.stateLabel(record.estadoResultante),
      apto: AuditorAptitude.describe(record.estadoResultante, record.vigenciaHasta, today),
      vigencia_hasta: record.vigenciaHasta,
    };
  }
}
