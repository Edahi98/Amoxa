import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';
import { ActionBuilder } from '@sdui-builder/action-builder.js';
import { ActionDecorator } from '@sdui-decorators/action.decorator.js';
import { ScreenDecorator } from '@sdui-decorators/screen.decorator.js';
import { ScreenDefinition } from '@sdui-definition-screen/screen-definition.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { RuleKit } from '@sdui-kit/rule-kit.js';
import { UiKit } from '@sdui-kit/ui-kit.js';

@ScreenDecorator.of({ screenId: 'acceso.login', title: 'Iniciar sesión', subtitle: 'Ingrese con su correo y contraseña' })
export class LoginScreen extends ScreenDefinition {
  public define(builder: ScreenBuilder): void {
    ActionKit.registerNavigation(builder, 'inicio');
    builder
      .root(
        UiKit.page(
          'root',
          UiKit.card(
            'formulario',
            'Credenciales',
            UiKit.textInput('email', 'Correo electrónico', 'email', { inputType: 'email', placeholder: 'nombre@organizacion.com' })
              .required()
              .validations('CREDENCIALES_INCOMPLETAS'),
            UiKit.textInput('password', 'Contraseña', 'password', { inputType: 'password' })
              .required()
              .validations('CREDENCIALES_INCOMPLETAS'),
            UiKit.button('btn_entrar', 'Entrar', 'primary', 'entrar', 'lg'),
          ),
        ),
      )
      .rule(RuleKit.anyEmpty('CREDENCIALES_INCOMPLETAS', ['email', 'password'], 'Ingrese su correo y su contraseña.'));
  }

  @ActionDecorator.of({ id: 'entrar', permission: 'sesion.entrar' })
  public entrar(): ActionBuilder {
    return ActionKit.submit('POST', '/auth/login', 'CREDENCIALES_INCOMPLETAS').onSuccess('ir_inicio');
  }
}
