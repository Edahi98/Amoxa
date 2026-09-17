import { AuthTemplate } from '@templates/AuthTemplate.js';
import { LoginForm } from '@organisms/LoginForm.js';

export function Login() {
  return (
    <AuthTemplate title="Inicia sesión" subtitle="Entra con tu correo y contraseña de Amoxa.">
      <LoginForm />
    </AuthTemplate>
  );
}
