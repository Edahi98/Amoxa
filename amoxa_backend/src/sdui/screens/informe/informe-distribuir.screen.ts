import { ActionBuilder } from '@sdui-builder/action-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import type { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { StateMachineBuilder } from '@sdui-builder/state-machine-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import type { OptionSpec } from '@sdui-kit/kit-types.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'informe.distribuir', title: 'Distribuir informe', subtitle: 'Destinatarios del informe firmado' })
export class InformeDistribuirScreen extends ScreenDefinition {
  private destinatarios: OptionSpec[] = [];

  public prepare(context: ScreenContextBuilder): void {
    const opciones = context.build().data?.['opciones'] as { destinatarios?: OptionSpec[] } | undefined;
    this.destinatarios = opciones?.destinatarios ?? [];
  }

  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'informe.ver', 'informe.vista_previa', 'auditoria.lista');
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.banner(
            'aviso',
            'warning',
            'El envío debe incluir al menos a una persona de la dirección. Al enviarlo, la auditoría queda finalizada.',
          ),
          UiKit.section(
            'destinatarios_seccion',
            'Destinatarios',
            UiKit.personPicker('destinatarios', 'Destinatarios del informe', 'distribucion.destinatarios', this.destinatarios, true)
              .required()
              .validations('SIN_DESTINATARIOS', 'SIN_DESTINATARIO_DIRECCION'),
          ),
          UiKit.row(
            'acciones',
            UiKit.button('btn_enviar', 'Enviar informe', 'primary', 'enviar_informe'),
            UiKit.navButton('informe.ver', 'Ver informe', 'outline'),
            UiKit.navButton('informe.vista_previa', 'Volver a la vista previa', 'ghost'),
          ),
        ),
      )
      .rule(RuleKit.required('SIN_DESTINATARIOS', 'distribucion.destinatarios', 'Elija al menos un destinatario.'))
      .rule(
        RuleKit.flagFalse(
          'SIN_DESTINATARIO_DIRECCION',
          'distribucion.incluye_direccion',
          'El informe debe incluir al menos a una persona de la dirección.',
        ),
      )
      .rule(RuleKit.stateIsNot('INFORME_NO_FIRMADO', 'firmado', 'Solo se puede distribuir un informe firmado.'))
      .stateMachine(
        StateMachineBuilder.create().transition('distribuido', 'enviar_informe', {
          roles: ['lider'],
          requires: ['SIN_DESTINATARIOS', 'SIN_DESTINATARIO_DIRECCION', 'INFORME_NO_FIRMADO'],
        }),
      );
  }

  @ActionDecorator.of({ id: 'enviar_informe', permission: 'informe.distribuir' })
  public enviarInforme(): ActionBuilder {
    return ActionKit.submit(
      'POST',
      '/informes/{entity.id}/distribucion',
      'SIN_DESTINATARIOS',
      'SIN_DESTINATARIO_DIRECCION',
      'INFORME_NO_FIRMADO',
    ).confirmText('Al enviar el informe la auditoría queda finalizada.');
  }
}
