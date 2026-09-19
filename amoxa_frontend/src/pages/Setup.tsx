import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthTemplate } from '@templates/AuthTemplate.js';
import { LinkButton } from '@atoms-button/LinkButton.js';
import { SetupForm } from '@organisms/SetupForm.js';
import { useSetupStatus } from '@hooks/useSetupStatus.js';

export function Setup() {
  const [params, setParams] = useSearchParams();
  const [token] = useState(() => params.get('token'));
  const status = useSetupStatus();

  useEffect(() => {
    if (params.has('token')) {
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  return (
    <AuthTemplate
      title="Activa Amoxa"
      subtitle="Crea la cuenta que administra todo el sistema: usuarios, roles y solicitudes de contraseña. Se hace una sola vez."
    >
      {!token ? (
        <p role="status" className="text-sm text-foreground">
          Abre el enlace completo que el servidor imprime en su registro al arrancar. Tiene la forma{' '}
          <span className="break-all font-medium">…/setup?token=…</span>
        </p>
      ) : null}
      {token && status === 'loading' ? (
        <p role="status" className="text-sm text-muted-foreground">
          Verificando el estado del sistema…
        </p>
      ) : null}
      {token && status === 'error' ? (
        <p role="alert" className="text-sm text-destructive">
          No hay conexión con el servidor. Revisa que esté en marcha y recarga la página.
        </p>
      ) : null}
      {token && status === 'initialized' ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">El sistema ya está activado.</p>
          <LinkButton to="/login" size="lg" className="w-full">
            Iniciar sesión
          </LinkButton>
        </div>
      ) : null}
      {token && status === 'pending' ? <SetupForm token={token} /> : null}
    </AuthTemplate>
  );
}
