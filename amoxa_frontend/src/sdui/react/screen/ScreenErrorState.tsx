import { Button } from '@atoms-button/Button.js';
import { EmptyState } from '@molecules-feedback/EmptyState.js';
import type { ScreenLoadError, ScreenLoadErrorKind } from '@sdui-api-screen/screen-load-error';

export interface ScreenErrorStateProps {
  error: ScreenLoadError;
  onRetry: () => void;
}

const TITLES: Record<ScreenLoadErrorKind, string> = {
  unauthorized: 'Tu sesión expiró',
  forbidden: 'Sin acceso a esta pantalla',
  not_found: 'Pantalla no encontrada',
  network: 'Sin conexión con el servidor',
  server: 'No se pudo cargar la pantalla',
  invalid: 'La pantalla no se puede mostrar',
};

export function ScreenErrorState({ error, onRetry }: ScreenErrorStateProps) {
  return (
    <div role="alert">
      <EmptyState title={TITLES[error.kind]} description={error.message}>
        {error.retryable ? <Button onClick={onRetry}>Reintentar</Button> : null}
      </EmptyState>
    </div>
  );
}
