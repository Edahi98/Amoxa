import { ROLES, type RoleKey } from '@shared/roles.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';
import { InicioKpis } from '@screens-acceso-inicio/inicio-kpis.js';
import { InicioLayout } from '@screens-acceso-inicio/inicio-layout.js';

@ScreenDecorator.of({ screenId: 'inicio', title: 'Inicio', subtitle: 'Resumen de su actividad' })
export class InicioScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder, role: RoleKey): void {
    const primary = InicioLayout.primaryAction(role);
    const titles = InicioLayout.titles(role);
    const kpis = InicioKpis.for(role);
    const destinos = [primary?.screenId, titles.enCursoDestino].filter((id): id is string => id !== undefined);
    ActionKit.registerNavigation(builder, ...new Set(destinos));

    const enCurso = UiKit.cards('en_curso', titles.enCursoVacio, 'en_curso', 3);
    builder.root(
      UiKit.page(
        'root',
        UiKit.bar(
          'encabezado',
          UiKit.row(
            'saludo',
            UiKit.text('saludo_texto', 'Hola,', 'heading'),
            UiKit.boundText('usuario', 'user.nombre', '', 'heading'),
            UiKit.badge('rol', ROLES[role].label, 'neutral'),
          ),
          ...(primary ? [UiKit.navButton(primary.screenId, primary.label, 'primary')] : []),
        ),
        UiKit.grid('conteos', Math.min(kpis.length, 4) as 1 | 2 | 3 | 4, ...kpis),
        titles.enCursoDestino
          ? UiKit.sectionWithAction('seccion_en_curso', titles.enCurso, titles.enCursoDestino, 'Ver todo', enCurso)
          : UiKit.section('seccion_en_curso', titles.enCurso, enCurso),
        UiKit.section('seccion_agenda', titles.agenda, UiKit.list('agenda', titles.agendaVacia).bind('agenda')),
      ),
    );
  }
}
