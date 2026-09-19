import type { RoleKey } from '@shared/roles.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import type { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import type { OptionSpec } from '@sdui-kit/kit-types.js';
import { ScreenOptionsReader } from '@screens-planificacion/screen-options-reader.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'dashboard.programa', title: 'Dashboard del programa', subtitle: 'Indicadores del periodo' })
export class DashboardProgramaScreen extends ScreenDefinition {
  private procesos: OptionSpec[] = [];

  public override prepare(context: ScreenContextBuilder): void {
    this.procesos = ScreenOptionsReader.read(context, 'procesos');
  }

  public define(builder: ScreenBuilder, role: RoleKey): void {
    ActionKit.registerNavigation(builder, 'revision.direccion', 'revision.programa', 'inicio');
    builder.action(
      'aplicar_filtros',
      ActionKit.callApi('GET', '/programas/indicadores?periodo={data.filtros.periodo}&area={data.filtros.area}'),
    );
    const analisis =
      role === 'gestor'
        ? [
            UiKit.section(
              'analisis',
              'Análisis del gestor',
              UiKit.chart(
                'grafica_acciones',
                'doughnut',
                'Acciones por estado',
                [],
                ['Acciones'],
                'indicadores.acciones_por_estado',
              ),
            ),
          ]
        : [];
    builder.action(
      'descargar_reporte',
      ActionKit.callApi('GET', '/programas/indicadores/documento?periodo={data.filtros.periodo}&area={data.filtros.area}'),
    );
    builder.root(
      UiKit.page(
        'root',
        UiKit.section(
          'filtros',
          'Filtros',
          UiKit.row(
            'fila_filtros',
            UiKit.textInput('periodo', 'Periodo', 'filtros.periodo').on('change', 'aplicar_filtros'),
            UiKit.processPicker('area', 'Área', 'filtros.area', this.procesos).on('change', 'aplicar_filtros'),
          ),
        ),
        UiKit.section(
          'indicadores',
          'Indicadores',
          UiKit.row(
            'kpis',
            UiKit.kpi('kpi_auditorias', 'Auditorías realizadas', 'indicadores.auditorias_realizadas'),
            UiKit.kpi('kpi_hallazgos', 'Hallazgos abiertos', 'indicadores.hallazgos_abiertos'),
            UiKit.kpi('kpi_atrasadas', 'Acciones atrasadas', 'indicadores.acciones_atrasadas', undefined, 'danger'),
          ),
          UiKit.progress('avance_calendario', 'Cumplimiento del calendario', 'indicadores.cumplimiento_calendario'),
          UiKit.chart(
            'grafica_areas',
            'bar',
            'Incumplimientos por área',
            [],
            ['Incumplimientos'],
            'indicadores.incumplimientos_por_area',
          ),
          UiKit.chart(
            'grafica_atrasadas',
            'bar',
            'Acciones atrasadas por área',
            [],
            ['Acciones atrasadas'],
            'indicadores.atrasadas_por_area',
          ),
        ),
        ...analisis,
        UiKit.row(
          'acciones',
          UiKit.button('btn_actualizar', 'Actualizar indicadores', 'primary', 'aplicar_filtros'),
          UiKit.button('btn_reporte', 'Descargar reporte', 'outline', 'descargar_reporte'),
          UiKit.navButton('revision.direccion', 'Revisión por la dirección', 'outline'),
          UiKit.navButton('revision.programa', 'Revisión del programa', 'outline'),
          UiKit.navButton('inicio', 'Volver al inicio', 'ghost'),
        ),
      ),
    );
  }
}
