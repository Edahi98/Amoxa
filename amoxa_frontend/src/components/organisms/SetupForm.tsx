import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@atoms-form/Input.js';
import { PasswordInput } from '@atoms-form/PasswordInput.js';
import { Button } from '@atoms-button/Button.js';
import { LinkButton } from '@atoms-button/LinkButton.js';
import { SetupApi } from '@utils-auth-setup/setupApi.js';
import { SetupApiError } from '@utils-auth-setup/setupApiError.js';
import { SetupActivationSchema, type SetupActivationErrors } from '@validators/setupActivation.schema.js';

export interface SetupFormProps {
  token: string;
}

type TerminalState = 'used' | 'invalid';

export function SetupForm({ token }: SetupFormProps) {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [organizacion, setOrganizacion] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<SetupActivationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [terminal, setTerminal] = useState<TerminalState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bind = (field: keyof SetupActivationErrors, setter: (value: string) => void) => (event: ChangeEvent<HTMLInputElement>) => {
    setter(event.target.value);
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const focusFirstError = () => {
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const result = SetupActivationSchema.safeParse({ nombre, email, organizacion, password, confirmPassword });
    if (!result.success) {
      const flattened = result.error.flatten().fieldErrors;
      setFieldErrors({
        nombre: flattened.nombre?.[0],
        email: flattened.email?.[0],
        organizacion: flattened.organizacion?.[0],
        password: flattened.password?.[0],
        confirmPassword: flattened.confirmPassword?.[0],
      });
      focusFirstError();
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const data = result.data;
      await SetupApi.activate({
        setupToken: token,
        nombre: data.nombre,
        email: data.email,
        organizacion: data.organizacion,
        password: data.password,
      });
      navigate('/login', { state: { activated: true, email: data.email } });
    } catch (submitError) {
      if (submitError instanceof SetupApiError && submitError.status === 404) {
        setTerminal('used');
      } else if (submitError instanceof SetupApiError && submitError.status === 403) {
        setTerminal('invalid');
      } else {
        setFormError(submitError instanceof Error ? submitError.message : 'No se pudo activar el sistema.');
      }
      setIsSubmitting(false);
    }
  };

  if (terminal === 'used') {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-sm text-foreground">
          El sistema ya fue activado. Inicia sesión con la cuenta que se creó.
        </p>
        <LinkButton to="/login" size="lg" className="w-full">
          Iniciar sesión
        </LinkButton>
      </div>
    );
  }

  if (terminal === 'invalid') {
    return (
      <p role="alert" className="text-sm text-destructive">
        El enlace de activación venció o no es válido. Reinicia el servidor o copia el enlace más reciente que imprime al arrancar.
      </p>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">Todos los campos son obligatorios.</p>
      <fieldset disabled={isSubmitting} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
        <Input
          label="Nombre completo"
          name="nombre"
          autoComplete="name"
          autoCapitalize="words"
          required
          value={nombre}
          onChange={bind('nombre', setNombre)}
          error={fieldErrors.nombre}
        />
        <Input
          label="Correo electrónico"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={email}
          onChange={bind('email', setEmail)}
          error={fieldErrors.email}
        />
        <Input
          label="Organización"
          name="organizacion"
          autoComplete="organization"
          hint="La empresa cuyas auditorías vas a gestionar."
          required
          value={organizacion}
          onChange={bind('organizacion', setOrganizacion)}
          error={fieldErrors.organizacion}
        />
        <PasswordInput
          label="Contraseña"
          name="password"
          autoComplete="new-password"
          hint="Al menos 12 caracteres. Esta cuenta controla todo el sistema: guárdala en un gestor de contraseñas."
          required
          value={password}
          onChange={bind('password', setPassword)}
          error={fieldErrors.password}
        />
        <PasswordInput
          label="Repite la contraseña"
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={bind('confirmPassword', setConfirmPassword)}
          error={fieldErrors.confirmPassword}
        />
      </fieldset>
      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? 'Activando…' : 'Activar sistema'}
      </Button>
    </form>
  );
}
