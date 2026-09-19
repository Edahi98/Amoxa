import { useMemo } from 'react';
import { Dialog } from '@molecules-feedback/Dialog.js';
import { useScreen } from '@hooks-screen/useScreen.js';
import { ScreenRuntimeProvider } from '@contexts/ScreenRuntimeContext.js';
import { ScreenRenderer } from '@sdui-react-screen/ScreenRenderer';
import { ScreenSkeleton } from '@sdui-react-screen/ScreenSkeleton';
import { ScreenErrorState } from '@sdui-react-screen/ScreenErrorState';
import { ScreenRoute } from '@sdui-runtime-screen/screen-route';
import type { ModalState, RuntimeHost } from '@sdui-runtime/runtime-types';

export interface ModalScreenProps {
  modal: ModalState;
  close: () => void;
  host: Omit<RuntimeHost, 'reload' | 'closeModal'>;
}

export function ModalScreen({ modal, close, host }: ModalScreenProps) {
  const { state, refetch } = useScreen(modal.screenId, ScreenRoute.entityOf(modal.params));

  const nestedHost = useMemo<RuntimeHost>(
    () => ({
      navigate: (screenId, params) => {
        close();
        host.navigate(screenId, params);
      },
      logout: host.logout,
      getToken: host.getToken,
      reload: refetch,
      closeModal: close,
    }),
    [host, close, refetch],
  );

  return (
    <Dialog open title={state.status === 'ready' ? state.screen.title : 'Cargando…'} onClose={close}>
      {state.status === 'loading' ? <ScreenSkeleton /> : null}
      {state.status === 'error' ? <ScreenErrorState error={state.error} onRetry={refetch} /> : null}
      {state.status === 'ready' ? (
        <ScreenRuntimeProvider key={state.revision} screen={state.screen} host={nestedHost}>
          <ScreenRenderer
            embedded
            renderModal={(nested, closeNested) => <ModalScreen modal={nested} close={closeNested} host={nestedHost} />}
          />
        </ScreenRuntimeProvider>
      ) : null}
    </Dialog>
  );
}
