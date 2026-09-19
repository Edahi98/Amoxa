export type FindingKind = 'nc_mayor' | 'nc_menor' | 'observacion' | 'oportunidad' | 'conformidad' | 'buena_practica';
export type DbFindingType = 'conformidad' | 'NC' | 'OM' | 'buena_practica';
export type DbFindingClass = 'menor' | 'mayor';
export type FindingViolationCode = 'NC_SIN_CLAUSULA' | 'NC_SIN_EVIDENCIA_VERIFICADA';

export interface ResolvedFindingKind {
  tipo: DbFindingType;
  clasificacion: DbFindingClass | null;
  categoria: FindingKind;
}

export interface FindingViolation {
  code: FindingViolationCode;
  message: string;
}

export interface FindingCandidate {
  kind: FindingKind;
  clausula?: string | null;
  evidenciaVerificada: boolean;
}

export class FindingRules {
  public static readonly KINDS: readonly FindingKind[] = [
    'nc_mayor',
    'nc_menor',
    'observacion',
    'oportunidad',
    'conformidad',
    'buena_practica',
  ];

  public static resolve(kind: FindingKind): ResolvedFindingKind {
    switch (kind) {
      case 'nc_mayor':
        return { tipo: 'NC', clasificacion: 'mayor', categoria: kind };
      case 'nc_menor':
        return { tipo: 'NC', clasificacion: 'menor', categoria: kind };
      case 'conformidad':
        return { tipo: 'conformidad', clasificacion: null, categoria: kind };
      case 'buena_practica':
        return { tipo: 'buena_practica', clasificacion: null, categoria: kind };
      default:
        return { tipo: 'OM', clasificacion: null, categoria: kind };
    }
  }

  public static kindOf(row: {
    tipo: DbFindingType;
    clasificacion: DbFindingClass | null;
    categoria: string | null;
  }): FindingKind {
    if (row.categoria !== null && FindingRules.isKind(row.categoria)) {
      return row.categoria;
    }
    if (row.tipo === 'NC') {
      return row.clasificacion === 'mayor' ? 'nc_mayor' : 'nc_menor';
    }
    if (row.tipo === 'OM') {
      return 'observacion';
    }
    return row.tipo;
  }

  public static isKind(value: string): value is FindingKind {
    return (FindingRules.KINDS as readonly string[]).includes(value);
  }

  public static isNonConformity(kind: FindingKind): boolean {
    return kind === 'nc_mayor' || kind === 'nc_menor';
  }

  public static label(kind: FindingKind): string {
    const labels: Record<FindingKind, string> = {
      nc_mayor: 'No conformidad mayor',
      nc_menor: 'No conformidad menor',
      observacion: 'Observación',
      oportunidad: 'Oportunidad de mejora',
      conformidad: 'Conformidad',
      buena_practica: 'Buena práctica',
    };
    return labels[kind];
  }

  public static violations(candidate: FindingCandidate): FindingViolation[] {
    if (!FindingRules.isNonConformity(candidate.kind)) {
      return [];
    }
    const found: FindingViolation[] = [];
    if (candidate.clausula === undefined || candidate.clausula === null || candidate.clausula.trim() === '') {
      found.push({
        code: 'NC_SIN_CLAUSULA',
        message: 'Una no conformidad debe indicar la cláusula incumplida.',
      });
    }
    if (!candidate.evidenciaVerificada) {
      found.push({
        code: 'NC_SIN_EVIDENCIA_VERIFICADA',
        message:
          'No se puede guardar una no conformidad sin evidencia verificada: debe sustentarse con evidencia objetiva. Capture la evidencia en la respuesta del checklist y márquela como verificada.',
      });
    }
    return found;
  }
}
