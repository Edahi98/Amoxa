import { ActionBuilder } from '@sdui-builder/action-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'revision.programa', title: 'Revisión del programa', subtitle: 'Cierre del periodo y lecciones aprendidas' })
export class RevisionProgramaScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'dashboard.programa', 'programa.editar', 'inicio');
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.section(
            'resultados',
            'Resultados del periodo',
            UiKit.row(
              'kpis',
              UiKit.kpi('kpi_auditorias', 'Auditorías realizadas', 'indicadores.auditorias_realizadas'),
              UiKit.kpi('kpi_hallazgos', 'Hallazgos abiertos', 'indicadores.hallazgos_abiertos'),
              UiKit.kpi('kpi_acciones', 'Acciones atrasadas', 'indicadores.acciones_atrasadas', undefined, 'danger'),
            ),
            UiKit.progress('avance', 'Cumplimiento del calendario', 'indicadores.cumplimiento_calendario'),
          ),
          UiKit.section(
            'lecciones_seccion',
            'Lecciones aprendidas',
            UiKit.textarea('lecciones', 'Lecciones aprendidas del periodo', 'revision.lecciones')
              .required()
              .validations('LECCIONES_VACIAS'),
          ),
          UiKit.section(
            'siguiente',
            'Programa del siguiente periodo',
            UiKit.banner('aviso', 'info', 'El programa siguiente se crea a partir del actual y se ajusta después en el editor.'),
            UiKit.textInput('periodo_siguiente', 'Periodo siguiente', 'siguiente.periodo')
              .required()
              .validations('PERIODO_SIGUIENTE_VACIO'),
          ),
          UiKit.row(
            'acciones',
            UiKit.button('btn_lecciones', 'Registrar lecciones', 'primary', 'registrar_lecciones'),
            UiKit.button('btn_siguiente', 'Crear programa siguiente', 'outline', 'crear_siguiente_programa'),
            UiKit.navButton('programa.editar', 'Editar programa', 'ghost'),
            UiKit.navButton('dashboard.programa', 'Volver al dashboard', 'ghost'),
          ),
        ),
      )
      .rule(RuleKit.required('LECCIONES_VACIAS', 'revision.lecciones', 'Registre las lecciones aprendidas del periodo.'))
      .rule(RuleKit.required('PERIODO_SIGUIENTE_VACIO', 'siguiente.periodo', 'Indique el periodo del programa siguiente.'));
  }

  @ActionDecorator.of({ id: 'registrar_lecciones', permission: 'revision_programa.registrar_lecciones' })
  public registrarLecciones(): ActionBuilder {
    return ActionKit.submit('POST', '/programas/{entity.id}/lecciones', 'LECCIONES_VACIAS');
  }

  @ActionDecorator.of({ id: 'crear_siguiente_programa', permission: 'revision_programa.crear_version' })
  public crearSiguientePrograma(): ActionBuilder {
    return ActionKit.submit('POST', '/programas/{entity.id}/siguiente', 'PERIODO_SIGUIENTE_VACIO').confirmText(
      'Se creará un programa nuevo a partir del actual.',
    );
  }
}
