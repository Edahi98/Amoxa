import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Input } from '@atoms-form/Input.js';
import { Button } from '@atoms-button/Button.js';
import { useAuth } from '@hooks/useAuth.js';
import { AuthApiError } from '@utils-auth/authApiError.js';
import { LoginCredentialsSchema, type LoginCredentialsErrors } from '@validators/loginCredentials.schema.js';

export function LoginForm() {
  const navigate = useNavigate();
  const activation = useLocation().state as { activated?: boolean; email?: string } | null;
  const { login } = useAuth();
  const [email, setEmail] = useState(activation?.email ?? '');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginCredentialsErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const result = LoginCredentialsSchema.safeParse({ email, password });
    if (!result.success) {
      const flattened = result.error.flatten().fieldErrors;
      setFieldErrors({ email: flattened.email?.[0], password: flattened.password?.[0] });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await login(result.data.email, result.data.password);
      navigate('/dashboard');
    } catch (submitError) {
      const message = submitError instanceof AuthApiError ? submitError.message : 'No se pudo iniciar sesión';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {activation?.activated ? (
        <p role="status" className="text-sm text-foreground">
          Sistema activado. Inicia sesión con la cuenta que acabas de crear.
        </p>
      ) : null}
      <Input
        label="Correo"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={fieldErrors.email}
      />
      <Input
        label="Contraseña"
        type="password"
        name="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldErrors.password}
      />
      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  );
}
