import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'auditor.lista', title: 'Auditores', subtitle: 'Competencia y vigencia de cada auditor' })
export class AuditorListaScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'auditor.ficha', 'auditor.evaluacion', 'inicio');
    builder.action('refrescar', ActionKit.refresh());
    builder.action('abrir_ficha', ActionKit.navigate('auditor.ficha', { entityId: '{params.itemId}' }));
    builder.root(
      UiKit.page(
        'root',
        UiKit.section(
          'resumen',
          'Auditores registrados',
          UiKit.text('descripcion', 'Consulte quién está apto para auditar y hasta cuándo dura su vigencia.'),
          UiKit.list('auditores', 'Todavía no hay auditores registrados.').bind('auditores').on('press', 'abrir_ficha'),
        ),
        UiKit.row(
          'acciones',
          UiKit.navButton('auditor.ficha', 'Ver ficha del auditor', 'primary'),
          UiKit.navButton('auditor.evaluacion', 'Registrar evaluación', 'outline'),
          UiKit.button('btn_refrescar', 'Actualizar', 'ghost', 'refrescar'),
          UiKit.navButton('inicio', 'Volver al inicio', 'ghost'),
        ),
      ),
    );
  }
}
