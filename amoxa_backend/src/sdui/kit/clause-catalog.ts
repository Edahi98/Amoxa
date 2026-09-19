import type { OptionSpec } from '@sdui-kit/kit-types.js';

export class ClauseCatalog {
  private static readonly ISO_9001: readonly (readonly [string, string])[] = [
    ['4.1', 'Comprensión de la organización y de su contexto'],
    ['4.2', 'Comprensión de las necesidades y expectativas de las partes interesadas'],
    ['4.3', 'Determinación del alcance del sistema de gestión de la calidad'],
    ['4.4', 'Sistema de gestión de la calidad y sus procesos'],
    ['5.1', 'Liderazgo y compromiso'],
    ['5.2', 'Política de la calidad'],
    ['5.3', 'Roles, responsabilidades y autoridades en la organización'],
    ['6.1', 'Acciones para abordar riesgos y oportunidades'],
    ['6.2', 'Objetivos de la calidad y planificación para lograrlos'],
    ['6.3', 'Planificación de los cambios'],
    ['7.1', 'Recursos'],
    ['7.2', 'Competencia'],
    ['7.3', 'Toma de conciencia'],
    ['7.4', 'Comunicación'],
    ['7.5', 'Información documentada'],
    ['8.1', 'Planificación y control operacional'],
    ['8.2', 'Requisitos para los productos y servicios'],
    ['8.3', 'Diseño y desarrollo de los productos y servicios'],
    ['8.4', 'Control de los procesos, productos y servicios suministrados externamente'],
    ['8.5', 'Producción y provisión del servicio'],
    ['8.6', 'Liberación de los productos y servicios'],
    ['8.7', 'Control de las salidas no conformes'],
    ['9.1', 'Seguimiento, medición, análisis y evaluación'],
    ['9.2', 'Auditoría interna'],
    ['9.3', 'Revisión por la dirección'],
    ['10.1', 'Mejora: generalidades'],
    ['10.2', 'No conformidad y acción correctiva'],
    ['10.3', 'Mejora continua'],
  ];

  public static options(): OptionSpec[] {
    const iso = ClauseCatalog.ISO_9001.map(([value, title]) => ({
      value,
      label: `ISO 9001 ${value}`,
      description: title,
    }));
    return [...iso, { value: 'propio', label: 'Requisito propio', description: 'Requisito propio de la organización' }];
  }
}
