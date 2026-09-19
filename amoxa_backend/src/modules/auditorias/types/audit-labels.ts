import type { AuditMethod, MiembroEquipo } from '@auditorias-types/auditoria-detalle.js';

export class AuditLabels {
  private static readonly METHODS: Readonly<Record<AuditMethod, string>> = {
    in_situ: 'Presencial',
    remoto: 'Remoto',
    mixto: 'Mixto',
  };

  private static readonly ROLES: Readonly<Record<MiembroEquipo['rol'], string>> = {
    lider: 'Líder de auditoría',
    auditor: 'Auditor',
    formacion: 'Auditor en formación',
    experto: 'Experto técnico',
  };

  public static method(method: AuditMethod): string {
    return AuditLabels.METHODS[method];
  }

  public static role(role: MiembroEquipo['rol']): string {
    return AuditLabels.ROLES[role];
  }
}
