import type { RoleKey } from '@shared/roles.js';
import { ActionBuilder } from '@sdui-builder/action-builder.js';
import type { ComponentBuilder } from '@sdui-builder/component-builder.js';
import { ConditionBuilder } from '@sdui-builder/condition-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'auditoria.contacto', title: 'Contacto y viabilidad', subtitle: 'Información, cooperación y tiempo suficientes' })
export class AuditoriaContactoScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder, role: RoleKey): void {
    ActionKit.registerNavigation(builder, 'auditoria.equipo', 'auditoria.lista');
    const contenido: ComponentBuilder[] =
      role === 'dueno_proceso'
        ? [
            UiKit.banner('aviso', 'info', 'El líder solicita confirmar que existe información, cooperación y tiempo para la auditoría.'),
            UiKit.textarea('respuesta', 'Respuesta al líder', 'contacto.respuesta').required().validations('RESPUESTA_VACIA'),
          ]
        : [
            UiKit.toggle('informacion', 'Hay información suficiente', 'contacto.informacion_suficiente'),
            UiKit.toggle('cooperacion', 'Hay cooperación del área', 'contacto.cooperacion'),
            UiKit.toggle('tiempo', 'Hay tiempo suficiente', 'contacto.tiempo'),
            UiKit.textarea('observaciones', 'Observaciones', 'contacto.observaciones'),
            UiKit.boundText('respuesta_area', 'contacto.respuesta', '', 'caption', 'muted').visibleIf(
              ConditionBuilder.field('contacto.respuesta', 'not_empty'),
            ),
          ];
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.section('viabilidad', 'Viabilidad de la auditoría', ...contenido),
          UiKit.row(
            'acciones',
            UiKit.button('btn_confirmar', 'Confirmar viabilidad', 'primary', 'confirmar_viabilidad'),
            UiKit.button('btn_responder', 'Enviar respuesta', 'primary', 'responder_contacto'),
            UiKit.navButton('auditoria.equipo', 'Equipo auditor', 'outline'),
            UiKit.navButton('auditoria.lista', 'Volver a auditorías', 'ghost'),
          ),
        ),
      )
      .rule(
        RuleKit.when(
          'VIABILIDAD_INCOMPLETA',
          ConditionBuilder.any(
            ConditionBuilder.field('contacto.informacion_suficiente', 'ne', true),
            ConditionBuilder.field('contacto.cooperacion', 'ne', true),
            ConditionBuilder.field('contacto.tiempo', 'ne', true),
          ),
          'No se puede confirmar la viabilidad sin información, cooperación y tiempo suficientes.',
        ),
      )
      .rule(RuleKit.required('RESPUESTA_VACIA', 'contacto.respuesta', 'Escriba su respuesta al líder.'));
  }

  @ActionDecorator.of({ id: 'confirmar_viabilidad', permission: 'auditoria.confirmar_contacto' })
  public confirmarViabilidad(): ActionBuilder {
    return ActionKit.submit('POST', '/auditorias/{entity.id}/contacto/confirmacion', 'VIABILIDAD_INCOMPLETA');
  }

  @ActionDecorator.of({ id: 'responder_contacto', permission: 'auditoria.responder_contacto' })
  public responderContacto(): ActionBuilder {
    return ActionKit.submit('POST', '/auditorias/{entity.id}/contacto/respuesta', 'RESPUESTA_VACIA');
  }
}
