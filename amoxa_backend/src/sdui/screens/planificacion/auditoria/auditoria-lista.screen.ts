import type { RoleKey } from '@shared/roles.js';
import type { ButtonVariant } from '@sdui-kit/kit-types.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'auditoria.lista', title: 'Auditorías', subtitle: 'Auditorías del programa según su rol' })
export class AuditoriaListaScreen extends ScreenDefinition {
  private static readonly DESCRIPCION: Partial<Record<RoleKey, string>> = {
    gestor: 'Todas las auditorías del programa, con su alcance y su equipo.',
    lider: 'Auditorías que usted lidera, con su alcance, contacto y plan.',
    auditor: 'Auditorías en las que fue asignado como auditor.',
    dueno_proceso: 'Auditorías que involucran a su área.',
  };

  private static readonly PRIMARIA: Partial<Record<RoleKey, string>> = {
    gestor: 'auditoria.alcance',
    lider: 'auditoria.alcance',
    auditor: 'auditoria.plan',
    dueno_proceso: 'auditoria.plan_aprobar',
  };

  public define(builder: ScreenBuilder, role: RoleKey): void {
    const destinos = [
      ['auditoria.alcance', 'Alcance, criterios y método'],
      ['auditoria.contacto', 'Contacto y viabilidad'],
      ['auditoria.equipo', 'Equipo auditor'],
      ['auditoria.plan', 'Plan de auditoría'],
      ['auditoria.plan_aprobar', 'Aprobar plan'],
      ['ejecucion.apertura', 'Reunión de apertura'],
    ] as const;
    ActionKit.registerNavigation(builder, ...destinos.map(([screenId]) => screenId), 'inicio');
    builder.action('refrescar', ActionKit.refresh());
    const variante = (screenId: string): ButtonVariant => (AuditoriaListaScreen.PRIMARIA[role] === screenId ? 'primary' : 'outline');
    builder.root(
      UiKit.page(
        'root',
        UiKit.section(
          'resumen',
          'Auditorías',
          UiKit.text('descripcion', AuditoriaListaScreen.DESCRIPCION[role] ?? ''),
          UiKit.list('auditorias', 'No hay auditorías para mostrar.').bind('auditorias'),
        ),
        UiKit.row(
          'acciones',
          ...destinos.map(([screenId, label]) => UiKit.navButton(screenId, label, variante(screenId))),
          UiKit.button('btn_refrescar', 'Actualizar', 'ghost', 'refrescar'),
          UiKit.navButton('inicio', 'Volver al inicio', 'ghost'),
        ),
      ),
    );
  }
}
