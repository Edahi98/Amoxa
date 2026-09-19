import { ROLES } from '@shared/roles.js';
import { RoleCatalog } from '@auth-roles/role-catalog.js';
import type { ActionBuilder } from '@sdui-builder/action-builder.js';
import { ConditionBuilder } from '@sdui-builder/condition-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'usuario.editar', title: 'Editar usuario', subtitle: 'Datos, rol, estado e invitación' })
export class UsuarioEditarScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'usuario.lista');
    const editable = ConditionBuilder.field('usuario.rol', 'ne', 'superusuario');
    const activo = ConditionBuilder.field('usuario.activo', 'eq', true);
    const inactivo = ConditionBuilder.field('usuario.activo', 'eq', false);
    const sinPassword = ConditionBuilder.field('usuario.passwordDefinida', 'eq', false);
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.banner(
            'aviso_superusuario',
            'info',
            'La cuenta del superusuario no se modifica desde esta pantalla. Solo su titular puede cambiar sus datos desde “Mi perfil”.',
          ).visibleIf(ConditionBuilder.field('usuario.rol', 'eq', 'superusuario')),
          UiKit.section(
            'datos',
            'Datos básicos',
            UiKit.textInput('nombre', 'Nombre completo', 'usuario.nombre').required().validations('NOMBRE_VACIO'),
            UiKit.textInput('email', 'Correo electrónico', 'usuario.email', { inputType: 'email', autoComplete: 'off' })
              .required()
              .validations('EMAIL_VACIO'),
            UiKit.button('btn_guardar', 'Guardar datos', 'primary', 'guardar_datos'),
          ).visibleIf(editable),
          UiKit.section(
            'rol_seccion',
            'Rol',
            UiKit.text('rol_ayuda', 'Al cambiar el rol se cierran las sesiones abiertas de la persona.', 'caption', 'muted'),
            UiKit.select(
              'rol',
              'Rol',
              'usuario.rol',
              RoleCatalog.assignable().map((role) => UiKit.option(role, ROLES[role].label)),
            ),
            UiKit.button('btn_rol', 'Cambiar rol', 'outline', 'cambiar_rol'),
          ).visibleIf(editable),
          UiKit.section(
            'estado_seccion',
            'Acceso',
            UiKit.badge('estado_activo', 'Cuenta activa', 'success').visibleIf(activo),
            UiKit.badge('estado_inactivo', 'Cuenta inactiva', 'neutral').visibleIf(inactivo),
            UiKit.button('btn_activar', 'Activar cuenta', 'outline', 'activar_usuario').visibleIf(inactivo),
            UiKit.button('btn_desactivar', 'Desactivar cuenta', 'danger', 'desactivar_usuario').visibleIf(activo),
          ).visibleIf(editable),
          UiKit.section(
            'invitacion_seccion',
            'Invitación',
            UiKit.text('invitacion_ayuda', 'Esta persona aún no define su contraseña. Genere un enlace nuevo; el anterior deja de funcionar.', 'caption', 'muted'),
            UiKit.button('btn_invitar', 'Generar nueva invitación', 'outline', 'reinvitar_usuario'),
            UiKit.banner(
              'aviso_enlace',
              'warning',
              'Este enlace se muestra una sola vez. Cópielo y entréguelo ahora.',
            ).visibleIf(ConditionBuilder.field('invitacion.url', 'not_empty')),
            UiKit.boundText('enlace', 'invitacion.url', '', 'body'),
            UiKit.boundText('vence', 'invitacion.expiresAt', '', 'caption', 'muted'),
          ).visibleIf(sinPassword),
          UiKit.row('acciones', UiKit.navButton('usuario.lista', 'Volver a usuarios', 'ghost')),
        ),
      )
      .rule(RuleKit.required('NOMBRE_VACIO', 'usuario.nombre', 'Escriba el nombre completo.'))
      .rule(RuleKit.required('EMAIL_VACIO', 'usuario.email', 'Escriba el correo electrónico.'));
  }

  @ActionDecorator.of({ id: 'guardar_datos', permission: 'usuario.editar' })
  public guardarDatos(): ActionBuilder {
    return ActionKit.callApi('PATCH', '/usuarios/{entity.id}', 'NOMBRE_VACIO', 'EMAIL_VACIO').payload({
      nombre: '{data.usuario.nombre}',
      email: '{data.usuario.email}',
    });
  }

  @ActionDecorator.of({ id: 'cambiar_rol', permission: 'usuario.cambiar_rol' })
  public cambiarRol(): ActionBuilder {
    return ActionKit.callApi('PATCH', '/usuarios/{entity.id}/role')
      .payload({ rol: '{data.usuario.rol}' })
      .confirmText('Se cerrarán las sesiones abiertas de esta persona. ¿Cambiar el rol?');
  }

  @ActionDecorator.of({ id: 'activar_usuario', permission: 'usuario.cambiar_estado' })
  public activarUsuario(): ActionBuilder {
    return ActionKit.callApi('PATCH', '/usuarios/{entity.id}/status').payload({ activo: true });
  }

  @ActionDecorator.of({ id: 'desactivar_usuario', permission: 'usuario.cambiar_estado' })
  public desactivarUsuario(): ActionBuilder {
    return ActionKit.callApi('PATCH', '/usuarios/{entity.id}/status')
      .payload({ activo: false })
      .confirmText('La persona perderá el acceso, se cerrarán sus sesiones y se cancelarán sus solicitudes de contraseña. ¿Desactivar la cuenta?');
  }

  @ActionDecorator.of({ id: 'reinvitar_usuario', permission: 'usuario.invitar' })
  public reinvitarUsuario(): ActionBuilder {
    return ActionKit.callApi('POST', '/usuarios/{entity.id}/invite').payload({});
  }
}
