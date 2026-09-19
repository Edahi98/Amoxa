export interface InicioMenuGroup {
  id: string;
  title: string;
  screens: string[];
}

export class InicioMenuGroups {
  private static readonly HIDDEN: readonly string[] = ['usuario.editar'];

  private static readonly TITLES: ReadonlyArray<readonly [string, string, readonly string[]]> = [
    ['administracion', 'Administración', ['usuario', 'solicitud']],
    ['programa', 'Programa anual', ['programa']],
    ['plantillas', 'Plantillas', ['plantilla']],
    ['auditores', 'Auditores', ['auditor']],
    ['auditorias', 'Auditorías', ['auditoria']],
    ['ejecucion', 'Ejecución', ['ejecucion', 'hallazgo']],
    ['informes', 'Informes', ['informe']],
    ['acciones', 'Acciones', ['accion']],
    ['seguimiento', 'Seguimiento', ['dashboard', 'revision']],
    ['registros', 'Registros', ['registro']],
    ['cuenta', 'Mi cuenta', ['notificaciones', 'perfil']],
  ];

  public static build(screenIds: readonly string[]): InicioMenuGroup[] {
    const visible = screenIds.filter((screenId) => !InicioMenuGroups.HIDDEN.includes(screenId));
    const groups = InicioMenuGroups.TITLES.map(([id, title, prefixes]) => ({
      id,
      title,
      screens: visible.filter((screenId) => prefixes.includes(screenId.split('.')[0])),
    }));
    const placed = new Set(groups.flatMap((group) => group.screens));
    const others = visible.filter((screenId) => !placed.has(screenId));
    return [...groups, { id: 'otras', title: 'Otras pantallas', screens: others }].filter((group) => group.screens.length > 0);
  }
}
