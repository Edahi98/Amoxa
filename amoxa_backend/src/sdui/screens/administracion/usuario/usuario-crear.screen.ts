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

@ScreenDecorator.of({ screenId: 'usuario.crear', title: 'Crear usuario', subtitle: 'Alta con enlace de invitación' })
export class UsuarioCrearScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'usuario.lista');
    const linkVisible = ConditionBuilder.field('invitacion.url', 'not_empty');
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.banner(
            'aviso',
            'info',
            'La cuenta se crea inactiva y sin contraseña. La persona la activa al definir su contraseña con el enlace de invitación, que vence en 48 horas.',
          ),
          UiKit.section(
            'datos',
            'Datos de la cuenta',
            UiKit.textInput('nombre', 'Nombre completo', 'nuevo.nombre').required().validations('NOMBRE_VACIO'),
            UiKit.textInput('email', 'Correo electrónico', 'nuevo.email', { inputType: 'email', autoComplete: 'off' })
              .required()
              .validations('EMAIL_VACIO'),
            UiKit.select(
              'rol',
              'Rol',
              'nuevo.rol',
              RoleCatalog.assignable().map((role) => UiKit.option(role, ROLES[role].label)),
            )
              .required()
              .validations('ROL_VACIO'),
          ),
          UiKit.section(
            'invitacion_seccion',
            'Enlace de invitación',
            UiKit.banner(
              'aviso_enlace',
              'warning',
              'Este enlace se muestra una sola vez. Cópielo y entréguelo a la persona ahora; si lo pierde, genere uno nuevo desde la ficha del usuario.',
            ),
            UiKit.boundText('enlace', 'invitacion.url', '', 'body'),
            UiKit.boundText('vence', 'invitacion.expiresAt', '', 'caption', 'muted'),
          ).visibleIf(linkVisible),
          UiKit.row(
            'acciones',
            UiKit.button('btn_crear', 'Crear usuario', 'primary', 'crear_usuario'),
            UiKit.navButton('usuario.lista', 'Volver a usuarios', 'ghost'),
          ),
        ),
      )
      .rule(RuleKit.required('NOMBRE_VACIO', 'nuevo.nombre', 'Escriba el nombre completo.'))
      .rule(RuleKit.required('EMAIL_VACIO', 'nuevo.email', 'Escriba el correo electrónico.'))
      .rule(RuleKit.required('ROL_VACIO', 'nuevo.rol', 'Elija un rol.'));
  }

  @ActionDecorator.of({ id: 'crear_usuario', permission: 'usuario.crear' })
  public crearUsuario(): ActionBuilder {
    return ActionKit.callApi('POST', '/usuarios', 'NOMBRE_VACIO', 'EMAIL_VACIO', 'ROL_VACIO').payload({
      nombre: '{data.nuevo.nombre}',
      email: '{data.nuevo.email}',
      rol: '{data.nuevo.rol}',
    });
  }
}
