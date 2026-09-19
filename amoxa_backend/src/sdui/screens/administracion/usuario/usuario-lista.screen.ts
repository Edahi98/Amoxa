import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'usuario.lista', title: 'Usuarios', subtitle: 'Cuentas, roles y estado de acceso' })
export class UsuarioListaScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'usuario.crear', 'usuario.editar', 'solicitud.lista', 'perfil.editar', 'inicio');
    builder.action('refrescar', ActionKit.refresh());
    builder.action('abrir_usuario', ActionKit.navigate('usuario.editar', { entityId: '{params.itemId}' }));
    builder.root(
      UiKit.page(
        'root',
        UiKit.section(
          'cuentas',
          'Cuentas',
          UiKit.boundText('resumen', 'resumen', '', 'caption', 'muted'),
          UiKit.table('usuarios', 'Usuarios registrados', 'Todavía no hay usuarios registrados. Cree el primero con “Crear usuario”.', 'usuarios', [
            { key: 'nombre', label: 'Nombre', sortable: true },
            { key: 'email', label: 'Correo', sortable: true },
            { key: 'rol', label: 'Rol', sortable: true },
            {
              key: 'estado',
              label: 'Estado',
              kind: 'badge',
              sortable: true,
              tones: { Activo: 'success', Inactivo: 'neutral', 'Invitación pendiente': 'warning' },
            },
            { key: 'ultimoAcceso', label: 'Último acceso', kind: 'date', sortable: true },
          ]).on('press', 'abrir_usuario'),
        ),
        UiKit.row(
          'acciones',
          UiKit.navButton('usuario.crear', 'Crear usuario', 'primary'),
          UiKit.navButton('solicitud.lista', 'Solicitudes de contraseña', 'outline'),
          UiKit.navButton('perfil.editar', 'Mi perfil', 'outline'),
          UiKit.button('btn_refrescar', 'Actualizar', 'ghost', 'refrescar'),
          UiKit.navButton('inicio', 'Volver al inicio', 'ghost'),
        ),
      ),
    );
  }
}
