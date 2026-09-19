import type { HallazgoResumen } from '@informes-rules-informe/informe.types.js';

export class InformeContentBuilder {
  public static readonly SAMPLING_STATEMENT =
    'La auditoría se basó en un muestreo de la información disponible durante el período auditado; por ello existe una incertidumbre inherente y no se puede asegurar que no existan otros hallazgos (ISO 19011).';

  public static kindLabel(hallazgo: HallazgoResumen): string {
    if (hallazgo.tipo === 'NC') {
      return hallazgo.clasificacion === 'mayor' ? 'No conformidad mayor' : 'No conformidad menor';
    }
    if (hallazgo.tipo === 'OM') {
      return 'Oportunidad de mejora';
    }
    return hallazgo.tipo === 'buena_practica' ? 'Buena práctica' : 'Conformidad';
  }

  public static count(
    hallazgos: readonly HallazgoResumen[],
    tipo: HallazgoResumen['tipo'],
    clasificacion?: 'menor' | 'mayor',
  ): number {
    return hallazgos.filter(
      (hallazgo) => hallazgo.tipo === tipo && (clasificacion === undefined || (hallazgo.clasificacion ?? 'menor') === clasificacion),
    ).length;
  }

  public static conformity(hallazgos: readonly HallazgoResumen[]): string {
    if (hallazgos.length === 0) {
      return 'Sin hallazgos registrados';
    }
    const conformes = hallazgos.filter((hallazgo) => hallazgo.tipo !== 'NC').length;
    const percent = Math.round((conformes / hallazgos.length) * 100);
    return `${percent}% de conformidad (${conformes} de ${hallazgos.length} hallazgos sin no conformidad)`;
  }

  public static summary(procesos: readonly string[], hallazgos: readonly HallazgoResumen[]): string {
    const mayores = InformeContentBuilder.count(hallazgos, 'NC', 'mayor');
    const menores = InformeContentBuilder.count(hallazgos, 'NC', 'menor');
    const oportunidades = InformeContentBuilder.count(hallazgos, 'OM');
    const alcance = procesos.length === 0 ? 'los procesos definidos en el plan' : procesos.join(', ');
    return `Se auditó ${alcance}. Resultado: ${mayores} no conformidad(es) mayor(es), ${menores} menor(es) y ${oportunidades} oportunidad(es) de mejora, sobre ${hallazgos.length} hallazgo(s) registrados.`;
  }

  public static findingsText(hallazgos: readonly HallazgoResumen[]): string {
    if (hallazgos.length === 0) {
      return 'No se registraron hallazgos.';
    }
    return hallazgos
      .map((hallazgo, index) => {
        const clausula = hallazgo.criterio ? ` (cláusula ${hallazgo.criterio})` : '';
        return `${index + 1}. [${InformeContentBuilder.kindLabel(hallazgo)}] ${hallazgo.proceso}${clausula}: ${hallazgo.descripcion}`;
      })
      .join('\n');
  }

  public static suggestedConclusions(hallazgos: readonly HallazgoResumen[]): string {
    const mayores = InformeContentBuilder.count(hallazgos, 'NC', 'mayor');
    const menores = InformeContentBuilder.count(hallazgos, 'NC', 'menor');
    if (mayores + menores === 0) {
      return 'El sistema de gestión de la calidad cumple los criterios de auditoría evaluados y no se detectaron no conformidades.';
    }
    return `El sistema de gestión de la calidad cumple parcialmente los criterios de auditoría: se detectaron ${mayores} no conformidad(es) mayor(es) y ${menores} menor(es) que requieren acciones correctivas.`;
  }
}
