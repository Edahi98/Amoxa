import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@hooks/useAuth.js';
import { ScreenApi } from '@sdui-api-screen/screen-api';
import { ScreenLoadError } from '@sdui-api-screen/screen-load-error';
import type { ScreenModel } from '@sdui-model-screen/screen.model';

export interface ScreenParams {
  entityId?: string;
  entityType?: string;
}

export type ScreenState =
  | { status: 'loading' }
  | { status: 'ready'; screen: ScreenModel; revision: number }
  | { status: 'error'; error: ScreenLoadError };

export interface UseScreenResult {
  state: ScreenState;
  refetch: () => void;
}

interface Settled {
  key: string;
  revision: number;
  screen?: ScreenModel;
  error?: ScreenLoadError;
}

export function useScreen(screenId: string, params: ScreenParams = {}): UseScreenResult {
  const { token, user } = useAuth();
  const [settled, setSettled] = useState<Settled | null>(null);
  const [reloads, setReloads] = useState(0);
  const key = `${screenId}|${params.entityType ?? ''}|${params.entityId ?? ''}`;
  const { entityId, entityType } = params;
  const scope = user?.sub;

  useEffect(() => {
    const controller = new AbortController();

    ScreenApi.shared()
      .load({ screenId, entityId, entityType, token, scope, signal: controller.signal })
      .then((screen) => {
        setSettled((previous) => ({ key, screen, revision: (previous?.revision ?? 0) + 1 }));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const loadError =
          error instanceof ScreenLoadError ? error : new ScreenLoadError('server', 'No se pudo cargar la pantalla.');
        setSettled((previous) => ({ key, error: loadError, revision: previous?.revision ?? 0 }));
      });

    return () => controller.abort();
  }, [key, screenId, entityId, entityType, token, scope, reloads]);

  const refetch = useCallback(() => setReloads((count) => count + 1), []);

  let state: ScreenState = { status: 'loading' };
  if (settled && settled.key === key) {
    if (settled.screen) state = { status: 'ready', screen: settled.screen, revision: settled.revision };
    else if (settled.error) state = { status: 'error', error: settled.error };
  }

  return { state, refetch };
}
