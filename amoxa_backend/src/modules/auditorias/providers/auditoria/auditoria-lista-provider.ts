import { Injectable } from '@nestjs/common';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { AuditStatusTransitions } from '@auditorias-rules/audit-status-transitions.js';
import { PlanStatusTransitions } from '@auditorias-rules-plan/plan-status-transitions.js';
import { AuditLabels } from '@auditorias-types/audit-labels.js';
import { AuditoriaAccess } from '@auditorias-services-auditoria/auditoria-access.js';
import { AuditoriaReader } from '@auditorias-services-auditoria/auditoria-reader.js';
import { AuditoriaScreenProvider } from '@auditorias-providers-auditoria/auditoria-screen-provider.js';

@ScreenDataDecorator.of('auditoria.lista')
@Injectable()
export class AuditoriaListaProvider extends AuditoriaScreenProvider {
  constructor(
    access: AuditoriaAccess,
    versions: RecordVersionService,
    private readonly reader: AuditoriaReader,
  ) {
    super(access, versions);
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    const rows = await this.reader.list(request.user, request.role);
    const auditorias = rows.map((row) => ({
      id: row.id,
      title: `Auditoría de ${row.procesos.map((item) => item.nombre).join(', ') || 'procesos por definir'}`,
      description: `${row.periodo} · ${AuditLabels.method(row.metodo)} · ${row.fechaPlan ?? 'sin fecha'} · Líder: ${row.liderNombre}`,
      status: row.estado === 'planificada' ? `Planificada, plan ${PlanStatusTransitions.describe(row.planEstado)}` : AuditStatusTransitions.describe(row.estado),
      estado: row.estado,
      plan_estado: row.planEstado,
      programa_id: row.programaId,
      periodo: row.periodo,
      metodo: row.metodo,
      fecha_plan: row.fechaPlan,
      lider: row.liderNombre,
      procesos: row.procesos.map((item) => item.nombre),
      plantilla: row.plantilla.nombre,
      viabilidad_ok: row.viabilidadOk,
      plan_aprobado: row.planAprobado,
    }));
    return { data: { auditorias }, offline: AuditoriaScreenProvider.OFFLINE };
  }
}
