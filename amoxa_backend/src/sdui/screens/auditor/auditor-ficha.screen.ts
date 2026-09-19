import type { RoleKey } from '@shared/roles.js';
import { ActionBuilder } from '@sdui-builder/action-builder.js';
import { ConditionBuilder } from '@sdui-builder/condition-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import type { ComponentBuilder } from '@sdui-builder/component-builder.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'auditor.ficha', title: 'Ficha del auditor', subtitle: 'Formación, experiencia y aptitud' })
export class AuditorFichaScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder, role: RoleKey): void {
    ActionKit.registerNavigation(builder, 'auditor.evaluacion', 'auditor.lista', 'inicio');
    builder.action('refrescar', ActionKit.refresh());
    builder.action('descargar_documento', ActionKit.callApi('GET', '/auditores/{entity.id}/ficha/documento'));
    builder.action(ActionKit.navId('auditor.evaluacion'), ActionKit.navigate('auditor.evaluacion', { entityId: '{entity.id}' }));
    const datos: ComponentBuilder[] =
      role === 'gestor'
        ? [
            UiKit.textarea('formacion', 'Formación', 'auditor.formacion'),
            UiKit.textarea('experiencia', 'Experiencia en auditoría', 'auditor.experiencia'),
            UiKit.textarea('especialidades', 'Procesos y normas de especialidad', 'auditor.especialidades'),
          ]
        : [
            UiKit.boundText('formacion', 'auditor.formacion'),
            UiKit.boundText('experiencia', 'auditor.experiencia'),
            UiKit.boundText('especialidades', 'auditor.especialidades'),
          ];
    builder.root(
      UiKit.page(
        'root',
        UiKit.section(
          'ficha',
          role === 'gestor' ? 'Datos del auditor' : 'Mi ficha',
          UiKit.boundText('nombre', 'auditor.nombre', '', 'heading'),
          ...datos,
        ),
        UiKit.card(
          'aptitud',
          'Aptitud vigente',
          UiKit.boundText('apto', 'auditor.apto'),
          UiKit.boundText('vigencia', 'auditor.vigencia_hasta', '', 'caption', 'muted').visibleIf(
            ConditionBuilder.field('auditor.vigencia_hasta', 'not_empty'),
          ),
        ),
        UiKit.row(
          'acciones',
          UiKit.button('btn_guardar', 'Guardar ficha', 'primary', 'guardar_ficha'),
          UiKit.navButton('auditor.evaluacion', 'Registrar evaluación', 'outline'),
          UiKit.button('btn_documento', 'Descargar ficha (.docx)', 'outline', 'descargar_documento'),
          UiKit.button('btn_refrescar', 'Actualizar', 'ghost', 'refrescar'),
          UiKit.navButton('auditor.lista', 'Volver a auditores', 'ghost'),
          UiKit.navButton('inicio', 'Volver al inicio', 'ghost'),
        ),
      ),
    );
  }

  @ActionDecorator.of({ id: 'guardar_ficha', permission: 'auditor.editar_ficha' })
  public guardarFicha(): ActionBuilder {
    return ActionKit.submit('PUT', '/auditores/{entity.id}');
  }
}
