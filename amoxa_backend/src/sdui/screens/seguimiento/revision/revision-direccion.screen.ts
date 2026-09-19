import type { RoleKey } from '@shared/roles.js';
import { ActionBuilder } from '@sdui-builder/action-builder.js';
import type { ComponentBuilder } from '@sdui-builder/component-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'revision.direccion', title: 'Revisión por la dirección', subtitle: 'Resultados, decisiones y recursos asignados' })
export class RevisionDireccionScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder, role: RoleKey): void {
    ActionKit.registerNavigation(builder, 'dashboard.programa', 'revision.programa');
    builder.action('descargar_acta', ActionKit.callApi('GET', '/programas/{entity.id}/revision-direccion/acta'));
    const decision: ComponentBuilder[] =
      role === 'direccion'
        ? [
            UiKit.section(
              'decisiones_seccion',
              'Decisiones de la dirección',
              UiKit.banner('aviso', 'info', 'Sus decisiones y los recursos asignados quedan registrados y se conservan.'),
              UiKit.textarea('decisiones', 'Decisiones', 'revision.decisiones').required().validations('DECISIONES_VACIAS'),
              UiKit.textarea('recursos', 'Recursos asignados', 'revision.recursos'),
            ),
          ]
        : [];
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.section(
            'resumen',
            'Resumen de resultados',
            UiKit.boundText('texto_resumen', 'revision.resumen'),
            UiKit.row(
              'kpis',
              UiKit.kpi('kpi_auditorias', 'Auditorías realizadas', 'indicadores.auditorias_realizadas'),
              UiKit.kpi('kpi_hallazgos', 'Hallazgos abiertos', 'indicadores.hallazgos_abiertos'),
              UiKit.kpi('kpi_acciones', 'Acciones atrasadas', 'indicadores.acciones_atrasadas', undefined, 'danger'),
            ),
          ),
          ...decision,
          UiKit.row(
            'acciones',
            UiKit.button('btn_decidir', 'Registrar decisiones', 'primary', 'registrar_decisiones'),
            UiKit.button('btn_presentar', 'Presentar a la dirección', 'primary', 'presentar_resumen'),
            UiKit.button('btn_acta', 'Descargar acta', 'outline', 'descargar_acta'),
            UiKit.navButton('dashboard.programa', 'Volver al dashboard', 'outline'),
            UiKit.navButton('revision.programa', 'Revisión del programa', 'outline'),
          ),
        ),
      )
      .rule(RuleKit.required('DECISIONES_VACIAS', 'revision.decisiones', 'Registre las decisiones de la dirección.'));
  }

  @ActionDecorator.of({ id: 'registrar_decisiones', permission: 'revision_direccion.decidir' })
  public registrarDecisiones(): ActionBuilder {
    return ActionKit.submit('POST', '/programas/{entity.id}/revision-direccion/decisiones', 'DECISIONES_VACIAS').confirmText(
      'Las decisiones quedan registradas y no se pueden borrar.',
    );
  }

  @ActionDecorator.of({ id: 'presentar_resumen', permission: 'revision_direccion.presentar' })
  public presentarResumen(): ActionBuilder {
    return ActionKit.submit('POST', '/programas/{entity.id}/revision-direccion/presentacion');
  }
}
