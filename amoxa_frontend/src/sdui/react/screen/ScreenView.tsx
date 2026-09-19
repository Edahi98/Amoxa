import { useEffect, useMemo } from 'react';
import { useScreen } from '@hooks-screen/useScreen.js';
import { ScreenRuntimeProvider } from '@contexts/ScreenRuntimeContext.js';
import { ModalScreen } from '@sdui-react-screen/ModalScreen';
import { ScreenRenderer } from '@sdui-react-screen/ScreenRenderer';
import { ScreenSkeleton } from '@sdui-react-screen/ScreenSkeleton';
import { ScreenErrorState } from '@sdui-react-screen/ScreenErrorState';
import type { RuntimeHost } from '@sdui-runtime/runtime-types';

export interface ScreenViewProps {
  screenId: string;
  entityId?: string;
  entityType?: string;
  embedded?: boolean;
  host: Omit<RuntimeHost, 'reload'>;
}

export function ScreenView({ screenId, entityId, entityType, embedded = false, host }: ScreenViewProps) {
  const { state, refetch } = useScreen(screenId, { entityId, entityType });
  const runtimeHost = useMemo<RuntimeHost>(() => ({ ...host, reload: refetch }), [host, refetch]);
  const title = state.status === 'ready' && !embedded ? state.screen.title : undefined;

  useEffect(() => {
    if (title === undefined) return;
    const previous = document.title;
    document.title = `${title} · Amoxa`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  if (state.status === 'loading') {
    return embedded ? null : <ScreenSkeleton />;
  }

  if (state.status === 'error') {
    return <ScreenErrorState error={state.error} onRetry={refetch} />;
  }

  return (
    <ScreenRuntimeProvider key={state.revision} screen={state.screen} host={runtimeHost}>
      <ScreenRenderer embedded={embedded} renderModal={(modal, close) => <ModalScreen modal={modal} close={close} host={host} />} />
    </ScreenRuntimeProvider>
  );
}
