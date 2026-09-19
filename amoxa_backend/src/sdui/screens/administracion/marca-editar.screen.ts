import type { ActionBuilder } from '@sdui-builder/action-builder.js';
import { ConditionBuilder } from '@sdui-builder/condition-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'marca.editar', title: 'Marca del informe', subtitle: 'Logotipo, color y pie de página de los informes' })
export class MarcaEditarScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'inicio');
    builder.action('actualizar_pantalla', ActionKit.refresh());
    builder.root(
      UiKit.page(
        'root',
        UiKit.section(
          'identidad',
          'Identidad',
          UiKit.text(
            'ayuda',
            'Estos datos se aplican a los informes de auditoría en .docx, también a los que se comparten por enlace.',
            'body',
            'muted',
          ),
          UiKit.textInput('color', 'Color principal', 'marca.color', { placeholder: '#1D4ED8', hint: 'Seis dígitos hexadecimales, por ejemplo #1D4ED8.' }),
          UiKit.textInput('pie', 'Pie de página', 'marca.pie', { placeholder: 'Ejemplo: Documento confidencial · Calidad' }),
        ),
        UiKit.section(
          'logotipo',
          'Logotipo',
          UiKit.banner('logo_actual', 'success', 'Ya hay un logotipo cargado. Elija otro archivo para reemplazarlo.').visibleIf(
            ConditionBuilder.field('marca.tiene_logo', 'eq', true),
          ),
          UiKit.fileInput('logo', 'Archivo del logotipo', 'marca.logo', {
            accept: 'image/png,image/jpeg,.png,.jpg,.jpeg',
            maxBytes: 512 * 1024,
            hint: 'PNG o JPG de hasta 512 KB.',
          }),
        ),
        UiKit.row(
          'acciones',
          UiKit.button('btn_guardar', 'Guardar marca', 'primary', 'guardar_marca'),
          UiKit.button('btn_quitar', 'Quitar logotipo', 'outline', 'quitar_logo').visibleIf(ConditionBuilder.field('marca.tiene_logo', 'eq', true)),
          UiKit.navButton('inicio', 'Volver al inicio', 'ghost'),
        ),
      ),
    );
  }

  @ActionDecorator.of({ id: 'guardar_marca', permission: 'marca.editar' })
  public guardarMarca(): ActionBuilder {
    return ActionKit.callApi('PUT', '/marca').onSuccess('actualizar_pantalla');
  }

  @ActionDecorator.of({ id: 'quitar_logo', permission: 'marca.editar' })
  public quitarLogo(): ActionBuilder {
    return ActionKit.callApi('POST', '/marca/logo/quitar')
      .payload({})
      .confirmText('Los informes nuevos saldrán sin logotipo. ¿Quitarlo?')
      .onSuccess('actualizar_pantalla');
  }
}
