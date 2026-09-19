import type { ScreenFamily } from '@sdui-families-screen/screen-family';

export class ScreenFamilyRegistry {
  private static readonly FAMILIES: readonly ScreenFamily[] = [
    {
      key: 'home',
      title: 'Acceso e inicio',
      screens: ['acceso.login', 'inicio', 'notificaciones'],
      stages: [],
    },
    {
      key: 'programa',
      title: 'Programa de auditoría',
      clause: '9.2.2 a',
      screens: ['programa.lista', 'programa.editar', 'programa.aprobar'],
      stages: [
        { id: 'programa.lista', label: 'Programas y calendario' },
        { id: 'programa.editar', label: 'Crear o editar' },
        { id: 'programa.aprobar', label: 'Aprobar' },
      ],
    },
    {
      key: 'plantilla',
      title: 'Plantillas y criterios',
      clause: '9.2.1 a',
      screens: ['plantilla.lista', 'plantilla.editar', 'plantilla.publicar'],
      stages: [
        { id: 'plantilla.lista', label: 'Plantillas' },
        { id: 'plantilla.editar', label: 'Editor de checklist' },
        { id: 'plantilla.publicar', label: 'Publicar versión' },
      ],
    },
    {
      key: 'competencia',
      title: 'Competencia de auditores',
      clause: '7',
      screens: ['auditor.lista', 'auditor.ficha', 'auditor.evaluacion'],
      stages: [
        { id: 'auditor.lista', label: 'Auditores' },
        { id: 'auditor.ficha', label: 'Ficha de auditor' },
        { id: 'auditor.evaluacion', label: 'Registrar evaluación' },
      ],
    },
    {
      key: 'seguimiento',
      title: 'Seguimiento y revisión',
      clause: '9.3',
      screens: ['dashboard.programa', 'revision.direccion', 'revision.programa'],
      stages: [],
    },
    {
      key: 'registro',
      title: 'Registros',
      clause: '9.2.2 f',
      screens: ['registro.buscar', 'registro.historial'],
      stages: [],
    },
    {
      key: 'planificacion',
      title: 'Planificación de auditoría',
      clause: '9.2.2 b, c',
      screens: [
        'auditoria.lista',
        'auditoria.alcance',
        'auditoria.contacto',
        'auditoria.equipo',
        'auditoria.plan',
        'auditoria.plan_aprobar',
      ],
      stages: [
        { id: 'auditoria.lista', label: 'Auditorías' },
        { id: 'auditoria.alcance', label: 'Alcance, criterios y método' },
        { id: 'auditoria.contacto', label: 'Contacto y viabilidad' },
        { id: 'auditoria.equipo', label: 'Asignar equipo' },
        { id: 'auditoria.plan', label: 'Plan de auditoría' },
        { id: 'auditoria.plan_aprobar', label: 'Aprobar plan' },
      ],
    },
    {
      key: 'ejecucion',
      title: 'Ejecución',
      clause: '6.4',
      screens: ['ejecucion.apertura', 'ejecucion.checklist', 'hallazgo.lista', 'ejecucion.evidencia', 'ejecucion.cierre'],
      stages: [
        { id: 'ejecucion.apertura', label: 'Apertura' },
        { id: 'ejecucion.checklist', label: 'Checklist' },
        { id: 'hallazgo.lista', label: 'Hallazgos' },
        { id: 'ejecucion.evidencia', label: 'Evidencia' },
        { id: 'ejecucion.cierre', label: 'Cierre' },
      ],
    },
    {
      key: 'informe',
      title: 'Informe',
      clause: '9.2.2 d',
      screens: ['informe.vista_previa', 'informe.distribuir', 'informe.ver'],
      stages: [
        { id: 'informe.vista_previa', label: 'Vista previa' },
        { id: 'informe.distribuir', label: 'Distribuir' },
        { id: 'informe.ver', label: 'Ver informe' },
      ],
    },
    {
      key: 'accion',
      title: 'Acciones correctivas',
      clause: '9.2.2 e, 10.2',
      screens: ['accion.lista', 'accion.crear', 'accion.cierre', 'accion.verificar'],
      stages: [
        { id: 'accion.lista', label: 'Acciones' },
        { id: 'accion.crear', label: 'Crear acción' },
        { id: 'accion.cierre', label: 'Reportar cierre' },
        { id: 'accion.verificar', label: 'Verificar eficacia' },
      ],
    },
  ];

  private static readonly INDEX: ReadonlyMap<string, ScreenFamily> = new Map(
    ScreenFamilyRegistry.FAMILIES.flatMap((family) => family.screens.map((id): [string, ScreenFamily] => [id, family])),
  );

  public static all(): readonly ScreenFamily[] {
    return ScreenFamilyRegistry.FAMILIES;
  }

  public static forScreen(screenId: string): ScreenFamily {
    return ScreenFamilyRegistry.INDEX.get(screenId) ?? ScreenFamilyRegistry.FAMILIES[0];
  }

  public static isKnown(screenId: string): boolean {
    return ScreenFamilyRegistry.INDEX.has(screenId);
  }
}
