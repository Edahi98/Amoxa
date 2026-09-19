import { Inject, Injectable } from '@nestjs/common';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { TeamEligibility } from '@auditorias-rules/team-eligibility.js';
import { AuditLabels } from '@auditorias-types/audit-labels.js';
import { AuditoriaAccess } from '@auditorias-services-auditoria/auditoria-access.js';
import { TeamCandidateLoader } from '@auditorias-services/team-candidate-loader.js';
import { TodayClock } from '@auditorias-services/today-clock.js';
import { AuditScreenBlocks } from '@auditorias-providers/audit-screen-blocks.js';
import { RoleAccess } from '@auth-roles/role-access.js';
import { AuditoriaScreenProvider } from '@auditorias-providers-auditoria/auditoria-screen-provider.js';

@ScreenDataDecorator.of('auditoria.equipo')
@Injectable()
export class AuditoriaEquipoProvider extends AuditoriaScreenProvider {
  constructor(
    access: AuditoriaAccess,
    versions: RecordVersionService,
    @Inject(DB) private readonly db: Db,
  ) {
    super(access, versions);
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    return this.build(request, async (detalle) => {
      const auditoria = AuditScreenBlocks.auditoria(detalle);
      if (!RoleAccess.actsAs(request.role, 'gestor')) {
        return {
          auditoria,
          equipo: {
            miembros: detalle.equipo.map((member) => ({
              id: member.auditorId,
              title: member.nombre,
              description: AuditLabels.role(member.rol),
            })),
            conflictos: [],
          },
        };
      }
      const audited = detalle.procesos.map((item) => item.id);
      const today = TodayClock.isoDate();
      const candidates = await TeamCandidateLoader.all(request.user.organizacionId, this.db);
      return {
        auditoria,
        equipo: { miembros: detalle.equipo.map((member) => member.auditorId), conflictos: [] },
        opciones: {
          auditores: candidates.map((candidate) => {
            const verdict = TeamEligibility.evaluate(candidate, audited, today);
            return {
              value: candidate.usuarioId,
              label: candidate.nombre,
              description: candidate.estado === 'formacion' ? 'En formación' : 'Auditor',
              ...(verdict.eligible ? {} : { disabled: true, disabledReason: verdict.reason }),
            };
          }),
        },
      };
    });
  }
}
