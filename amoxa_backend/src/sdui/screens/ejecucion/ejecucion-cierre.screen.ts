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

@ScreenDecorator.of({ screenId: 'ejecucion.cierre', title: 'Reunión de cierre', subtitle: 'Revisión de hallazgos con el área auditada' })
export class EjecucionCierreScreen extends ScreenDefinition {
  private datos: Record<string, unknown> | undefined;

  public prepare(context: ScreenContextBuilder): void {
    this.datos = context.build().data;
  }

  public define(builder: ScreenBuilder, role: RoleKey): void {
    ActionKit.registerNavigation(builder, 'informe.vista_previa', 'hallazgo.lista', 'auditoria.lista');
    const contenido: ComponentBuilder[] = this.contenidoPara(role);
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.kpi('pendientes', 'Hallazgos sin revisar', 'cierre.hallazgos_pendientes', undefined, 'warning'),
          UiKit.section('hallazgos', 'Hallazgos de la auditoría', UiKit.list('lista_hallazgos', 'No hay hallazgos para revisar.').bind('cierre.hallazgos')),
          UiKit.section('cierre', 'Cierre', ...contenido),
          UiKit.row(
            'acciones',
            UiKit.button('btn_cerrar', 'Cerrar auditoría', 'primary', 'cerrar_auditoria'),
            UiKit.button('btn_aceptar', 'Aceptar hallazgos', 'primary', 'aceptar_hallazgos'),
            UiKit.button('btn_asistir', 'Confirmar asistencia', 'primary', 'confirmar_asistencia_cierre'),
            UiKit.button('btn_anotar', 'Anotar revisión', 'outline', 'anotar_revision'),
            UiKit.button('btn_discrepar', 'Discrepar', 'outline', 'discrepar'),
            UiKit.button('btn_acta', 'Descargar acta', 'outline', 'descargar_acta'),
            UiKit.navButton('informe.vista_previa', 'Ir al informe', 'outline'),
            UiKit.navButton('hallazgo.lista', 'Volver a hallazgos', 'ghost'),
            UiKit.navButton('auditoria.lista', 'Volver a auditorías', 'ghost'),
          ),
        ),
      )
      .rule(RuleKit.countAbove('HALLAZGOS_SIN_REVISAR', 'cierre.hallazgos_pendientes', 0, 'No se puede cerrar la auditoría mientras haya hallazgos sin revisar.'))
      .rule(RuleKit.required('REVISION_SIN_RESULTADO', 'cierre.resultado_area', 'Anote si el área aceptó o discrepó del hallazgo.'))
      .rule(RuleKit.required('DISCREPANCIA_SIN_MOTIVO', 'cierre.motivo_discrepancia', 'Explique el motivo de la discrepancia.'))
      .stateMachine(
        StateMachineBuilder.create().transition('cerrada', 'cerrar_auditoria', {
          roles: ['lider'],
          requires: ['HALLAZGOS_SIN_REVISAR'],
        }),
      );
  }

  private contenidoPara(role: RoleKey): ComponentBuilder[] {
    const selector = UiKit.select(
      'hallazgo',
      'Hallazgo',
      'cierre.hallazgo_id',
      ScreenDataReader.options(this.datos, 'cierre.opciones_hallazgos'),
    );
    if (role === 'lider') {
      return [
        selector.required(),
        UiKit.radioGroup(
          'resultado_area',
          'Postura del área ante el hallazgo',
          'cierre.resultado_area',
          [UiKit.option('aceptado', 'Aceptó'), UiKit.option('discrepa', 'Discrepó')],
          { direction: 'row' },
        )
          .required()
          .validations('REVISION_SIN_RESULTADO'),
        UiKit.textarea('comentario', 'Comentarios', 'cierre.comentario'),
      ];
    }
    if (role === 'dueno_proceso') {
      return [
        UiKit.banner('aviso', 'info', 'Acepte los hallazgos o indique su discrepancia con el motivo.'),
        selector,
        UiKit.textarea('motivo', 'Motivo de la discrepancia', 'cierre.motivo_discrepancia').validations('DISCREPANCIA_SIN_MOTIVO'),
      ];
    }
    return [UiKit.banner('aviso', 'info', 'Su asistencia a la reunión de cierre es opcional.')];
  }

  @ActionDecorator.of({ id: 'anotar_revision', permission: 'ejecucion.presentar_cierre' })
  public anotarRevision(): ActionBuilder {
    return ActionKit.submit('POST', '/auditorias/{entity.id}/cierre/revisiones', 'REVISION_SIN_RESULTADO');
  }

  @ActionDecorator.of({ id: 'cerrar_auditoria', permission: 'ejecucion.presentar_cierre' })
  public cerrarAuditoria(): ActionBuilder {
    return ActionKit.submit('POST', '/auditorias/{entity.id}/cierre', 'HALLAZGOS_SIN_REVISAR').confirmText(
      'Al cerrar la auditoría se genera el borrador del informe.',
    );
  }

  @ActionDecorator.of({ id: 'aceptar_hallazgos', permission: 'ejecucion.aceptar_o_discrepar_cierre' })
  public aceptarHallazgos(): ActionBuilder {
    return ActionKit.submit('POST', '/auditorias/{entity.id}/cierre/aceptacion');
  }

  @ActionDecorator.of({ id: 'discrepar', permission: 'ejecucion.aceptar_o_discrepar_cierre' })
  public discrepar(): ActionBuilder {
    return ActionKit.submit('POST', '/auditorias/{entity.id}/cierre/discrepancia', 'DISCREPANCIA_SIN_MOTIVO');
  }

  @ActionDecorator.of({ id: 'confirmar_asistencia_cierre', permission: 'ejecucion.asistir_cierre' })
  public confirmarAsistenciaCierre(): ActionBuilder {
    return ActionKit.submit('POST', '/auditorias/{entity.id}/cierre/asistencia');
  }

  @ActionDecorator.of({ id: 'descargar_acta', permission: 'sesion.entrar' })
  public descargarActa(): ActionBuilder {
    return ActionKit.callApi('GET', '/auditorias/{entity.id}/reuniones/cierre/documento');
  }
}
