import type { RoleKey } from '@shared/roles.js';
import { ActionBuilder } from '@sdui-builder/action-builder.js';
import type { ComponentBuilder } from '@sdui-builder/component-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import type { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { StateMachineBuilder } from '@sdui-builder/state-machine-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';
import { ScreenDataReader } from '@screens-ejecucion/screen-data-reader.js';

@ScreenDecorator.of({ screenId: 'ejecucion.apertura', title: 'Reunión de apertura', subtitle: 'Asistentes y acuerdos iniciales' })
export class EjecucionAperturaScreen extends ScreenDefinition {
  private datos: Record<string, unknown> | undefined;

  public prepare(context: ScreenContextBuilder): void {
    this.datos = context.build().data;
  }

  public define(builder: ScreenBuilder, role: RoleKey): void {
    ActionKit.registerNavigation(builder, 'ejecucion.checklist', 'auditoria.lista');
    const contenido: ComponentBuilder[] =
      role === 'lider'
        ? [
            UiKit.banner('aviso', 'info', 'El líder preside la reunión. El auditor y el dueño del proceso asisten.'),
            UiKit.personPicker(
              'asistentes',
              'Asistentes',
              'apertura.asistentes',
              ScreenDataReader.options(this.datos, 'apertura.opciones_asistentes'),
              true,
            )
              .required()
              .validations('ASISTENTES_VACIO'),
            UiKit.textarea('notas', 'Notas de la reunión', 'apertura.notas'),
          ]
        : [
            UiKit.banner('aviso', 'info', 'Confirme su asistencia a la reunión de apertura.'),
            UiKit.boundText('notas', 'apertura.notas'),
          ];
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.auditCard('resumen', 'auditoria'),
          UiKit.section('apertura', 'Apertura', ...contenido),
          UiKit.row(
            'acciones',
            UiKit.button('btn_registrar', 'Registrar apertura', 'primary', 'registrar_apertura'),
            UiKit.button('btn_asistir', 'Confirmar asistencia', 'primary', 'confirmar_asistencia'),
            UiKit.button('btn_acta', 'Descargar acta', 'outline', 'descargar_acta'),
            UiKit.navButton('ejecucion.checklist', 'Ir al checklist', 'outline'),
            UiKit.navButton('auditoria.lista', 'Volver a auditorías', 'ghost'),
          ),
        ),
      )
      .rule(RuleKit.required('ASISTENTES_VACIO', 'apertura.asistentes', 'Registre a los asistentes de la reunión.'))
      .stateMachine(
        StateMachineBuilder.create().transition('en_curso', 'registrar_apertura', {
          roles: ['lider'],
          requires: ['ASISTENTES_VACIO'],
        }),
      );
  }

  @ActionDecorator.of({ id: 'registrar_apertura', permission: 'ejecucion.presidir_apertura' })
  public registrarApertura(): ActionBuilder {
    return ActionKit.submit('POST', '/auditorias/{entity.id}/apertura', 'ASISTENTES_VACIO');
  }

  @ActionDecorator.of({ id: 'confirmar_asistencia', permission: 'ejecucion.asistir_apertura' })
  public confirmarAsistencia(): ActionBuilder {
    return ActionKit.submit('POST', '/auditorias/{entity.id}/apertura/asistencia');
  }

  @ActionDecorator.of({ id: 'descargar_acta', permission: 'sesion.entrar' })
  public descargarActa(): ActionBuilder {
    return ActionKit.callApi('GET', '/auditorias/{entity.id}/reuniones/apertura/documento');
  }
}
