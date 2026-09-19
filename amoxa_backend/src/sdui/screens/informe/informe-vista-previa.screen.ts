import { ActionBuilder } from '@sdui-builder/action-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { StateMachineBuilder } from '@sdui-builder/state-machine-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'informe.vista_previa', title: 'Vista previa del informe', subtitle: 'Revisión de conclusiones y firma' })
export class InformeVistaPreviaScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'informe.distribuir', 'ejecucion.cierre', 'auditoria.lista');
    builder.action('descargar_documento', ActionKit.callApi('GET', '/informes/{entity.id}/documento'));
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.banner(
            'aviso',
            'info',
            'El sistema generó este borrador al cerrar la auditoría. Solo puede ajustar las conclusiones antes de firmar.',
          ),
          UiKit.card(
            'contenido',
            'Contenido generado',
            UiKit.boundText('titulo', 'informe.titulo', '', 'heading'),
            UiKit.boundText('resumen', 'informe.resumen'),
            UiKit.boundText('hallazgos', 'informe.hallazgos'),
          ),
          UiKit.section(
            'conclusiones_seccion',
            'Conclusiones',
            UiKit.textarea('conclusiones', 'Conclusiones del líder', 'informe.conclusiones', { rows: 6 })
              .required()
              .validations('CONCLUSIONES_VACIAS'),
          ),
          UiKit.section(
            'firma_seccion',
            'Firma',
            UiKit.signature('firma', 'Firma del líder auditor', 'informe.firma').required().validations('FIRMA_VACIA'),
          ),
          UiKit.row(
            'acciones',
            UiKit.button('btn_firmar', 'Firmar informe', 'primary', 'firmar_informe'),
            UiKit.button('btn_guardar', 'Guardar conclusiones', 'outline', 'guardar_conclusiones'),
            UiKit.button('btn_documento', 'Descargar borrador (.docx)', 'outline', 'descargar_documento'),
            UiKit.navButton('informe.distribuir', 'Distribuir informe', 'outline'),
            UiKit.navButton('ejecucion.cierre', 'Volver al cierre', 'ghost'),
          ),
        ),
      )
      .rule(RuleKit.required('CONCLUSIONES_VACIAS', 'informe.conclusiones', 'Escriba las conclusiones del informe.'))
      .rule(RuleKit.required('FIRMA_VACIA', 'informe.firma', 'Firme el informe antes de continuar.'))
      .rule(RuleKit.stateIsNot('INFORME_NO_BORRADOR', 'borrador', 'Solo se puede firmar un informe en borrador.'))
      .stateMachine(
        StateMachineBuilder.create().transition('firmado', 'firmar_informe', {
          roles: ['lider'],
          requires: ['CONCLUSIONES_VACIAS', 'FIRMA_VACIA', 'INFORME_NO_BORRADOR'],
        }),
      );
  }

  @ActionDecorator.of({ id: 'guardar_conclusiones', permission: 'informe.revisar' })
  public guardarConclusiones(): ActionBuilder {
    return ActionKit.submit('PUT', '/informes/{entity.id}/conclusiones', 'CONCLUSIONES_VACIAS');
  }

  @ActionDecorator.of({ id: 'firmar_informe', permission: 'informe.firmar' })
  public firmarInforme(): ActionBuilder {
    return ActionKit.submit('POST', '/informes/{entity.id}/firma', 'CONCLUSIONES_VACIAS', 'FIRMA_VACIA', 'INFORME_NO_BORRADOR').confirmText(
      'Al firmar, el informe ya no se puede modificar.',
    );
  }
}
