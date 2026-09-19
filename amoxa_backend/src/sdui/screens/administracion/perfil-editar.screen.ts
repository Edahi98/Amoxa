import type { ActionBuilder } from '@sdui-builder/action-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'perfil.editar', title: 'Mi perfil', subtitle: 'Datos personales y contraseña' })
export class PerfilEditarScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'inicio');
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.section(
            'datos',
            'Datos personales',
            UiKit.textInput('nombre', 'Nombre completo', 'perfil.nombre').required().validations('PERFIL_NOMBRE_VACIO'),
            UiKit.textInput('email', 'Correo electrónico', 'perfil.email', { inputType: 'email', autoComplete: 'email' })
              .required()
              .validations('PERFIL_EMAIL_VACIO'),
            UiKit.button('btn_guardar', 'Guardar datos', 'primary', 'guardar_perfil'),
          ),
          UiKit.section(
            'clave',
            'Cambiar contraseña',
            UiKit.text('clave_ayuda', 'Use al menos 12 caracteres. Al cambiarla se cierran sus otras sesiones abiertas.', 'caption', 'muted'),
            UiKit.textInput('actual', 'Contraseña actual', 'clave.actual', { inputType: 'password', autoComplete: 'current-password' })
              .required()
              .validations('CLAVE_ACTUAL_VACIA'),
            UiKit.textInput('nueva', 'Contraseña nueva', 'clave.nueva', { inputType: 'password', autoComplete: 'new-password' })
              .required()
              .validations('CLAVE_NUEVA_VACIA'),
            UiKit.button('btn_clave', 'Cambiar contraseña', 'outline', 'cambiar_clave'),
          ),
          UiKit.row('acciones', UiKit.navButton('inicio', 'Volver al inicio', 'ghost')),
        ),
      )
      .rule(RuleKit.required('PERFIL_NOMBRE_VACIO', 'perfil.nombre', 'Escriba su nombre completo.'))
      .rule(RuleKit.required('PERFIL_EMAIL_VACIO', 'perfil.email', 'Escriba su correo electrónico.'))
      .rule(RuleKit.required('CLAVE_ACTUAL_VACIA', 'clave.actual', 'Escriba su contraseña actual.'))
      .rule(RuleKit.required('CLAVE_NUEVA_VACIA', 'clave.nueva', 'Escriba la contraseña nueva.'));
  }

  @ActionDecorator.of({ id: 'guardar_perfil', permission: 'perfil.editar' })
  public guardarPerfil(): ActionBuilder {
    return ActionKit.callApi('PATCH', '/me', 'PERFIL_NOMBRE_VACIO', 'PERFIL_EMAIL_VACIO').payload({
      nombre: '{data.perfil.nombre}',
      email: '{data.perfil.email}',
    });
  }

  @ActionDecorator.of({ id: 'cambiar_clave', permission: 'perfil.cambiar_clave' })
  public cambiarClave(): ActionBuilder {
    return ActionKit.callApi('POST', '/me/password', 'CLAVE_ACTUAL_VACIA', 'CLAVE_NUEVA_VACIA').payload({
      currentPassword: '{data.clave.actual}',
      newPassword: '{data.clave.nueva}',
    });
  }
}
