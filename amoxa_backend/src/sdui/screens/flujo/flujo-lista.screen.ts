import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'flujo.lista', title: 'Flujos de trabajo', subtitle: 'Procesos guiados que avanzan con su trabajo' })
export class FlujoListaScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'flujo.guia', 'flujo.avance', 'inicio');
    builder.action('abrir_flujo', ActionKit.navigate('flujo.guia', { entityId: '{params.itemId}' }));
    builder.action('abrir_instancia', ActionKit.navigate('flujo.avance', { entityId: '{params.itemId}' }));
    builder.root(
      UiKit.page(
        'root',
        UiKit.section(
          'en_curso',
          'Mis flujos',
          UiKit.text('descripcion_en_curso', 'Procesos ya iniciados. El avance se actualiza solo conforme se hace el trabajo en el sistema.', 'body', 'muted'),
          UiKit.table('tabla_instancias', 'Flujos iniciados', 'Todavía no ha iniciado ningún flujo. Elija uno de la lista de abajo.', 'instancias', [
            { key: 'flujo', label: 'Flujo', sortable: true },
            { key: 'auditoria', label: 'Auditoría', sortable: true },
            { key: 'paso', label: 'Paso actual' },
            { key: 'avance', label: 'Avance' },
            { key: 'estado', label: 'Estado', kind: 'badge', sortable: true, tones: { 'En curso': 'primary', Concluido: 'success', Cancelado: 'danger' } },
          ]).on('press', 'abrir_instancia'),
        ),
        UiKit.section(
          'flujos',
          'Flujos disponibles',
          UiKit.text('descripcion', 'Elija un flujo para ver sus pasos e iniciarlo sobre una auditoría.', 'body', 'muted'),
          UiKit.table('tabla_flujos', 'Flujos de trabajo', 'Todavía no hay flujos de trabajo.', 'flujos', [
            { key: 'title', label: 'Flujo', sortable: true },
            { key: 'summary', label: 'Qué cubre' },
            { key: 'steps', label: 'Pasos', kind: 'number', sortable: true },
          ]).on('press', 'abrir_flujo'),
        ),
        UiKit.row('acciones', UiKit.navButton('inicio', 'Volver al inicio', 'ghost')),
      ),
    );
  }
}
