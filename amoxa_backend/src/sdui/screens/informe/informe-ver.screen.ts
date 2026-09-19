import { ActionBuilder } from '@sdui-builder/action-builder.js';
import { ConditionBuilder } from '@sdui-builder/condition-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'informe.ver', title: 'Ver informe', subtitle: 'Lectura del informe de auditoría' })
export class InformeVerScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'accion.lista', 'inicio');
    builder.action('descargar_documento', ActionKit.callApi('GET', '/informes/{entity.id}/documento'));
    builder.root(
      UiKit.page(
        'root',
        UiKit.card(
          'informe',
          'Informe de auditoría',
          UiKit.boundText('titulo', 'informe.titulo', '', 'heading'),
          UiKit.boundText('resumen', 'informe.resumen'),
          UiKit.boundText('hallazgos', 'informe.hallazgos'),
          UiKit.boundText('conclusiones', 'informe.conclusiones'),
        ),
        UiKit.card(
          'lectura',
          'Constancia de lectura',
          UiKit.boundText('leido_en', 'distribucion.leido_en', '', 'caption', 'muted'),
        ).visibleIf(ConditionBuilder.field('distribucion.leido_en', 'not_empty')),
        UiKit.row(
          'acciones',
          UiKit.button('btn_acusar', 'Acusar recibo', 'primary', 'acusar_recibo'),
          UiKit.button('btn_documento', 'Descargar informe (.docx)', 'outline', 'descargar_documento'),
          UiKit.navButton('accion.lista', 'Ver acciones', 'outline'),
          UiKit.navButton('inicio', 'Volver al inicio', 'ghost'),
        ),
      ),
    );
  }

  @ActionDecorator.of({ id: 'acusar_recibo', permission: 'informe.acusar_recibo' })
  public acusarRecibo(): ActionBuilder {
    return ActionKit.submit('POST', '/informes/{entity.id}/acuse');
  }
}
