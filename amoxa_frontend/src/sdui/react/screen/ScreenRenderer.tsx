import type { ReactNode } from 'react';
import { Button } from '@atoms-button/Button.js';
import { Dialog } from '@molecules-feedback/Dialog.js';
import { EmptyState } from '@molecules-feedback/EmptyState.js';
import { ToastRegion } from '@molecules-feedback/ToastRegion.js';
import { useScreenRuntime } from '@hooks-screen/useScreenRuntime.js';
import { NodeRenderer } from '@sdui-react-node/NodeRenderer';
import { RuleBanners } from '@sdui-react-screen/RuleBanners';
import { ScreenTemplateRegistry } from '@sdui-react-template/screen-template-registry';
import { ScreenFamilyRegistry } from '@sdui-families-screen/screen-family-registry';
import { ScreenContent } from '@sdui-runtime-screen/screen-content';
import type { ModalState } from '@sdui-runtime/runtime-types';

export interface ScreenRendererProps {
  embedded?: boolean;
  renderModal?: (modal: ModalState, close: () => void) => ReactNode;
}

export function ScreenRenderer({ embedded = false, renderModal }: ScreenRendererProps) {
  const runtime = useScreenRuntime();
  const { screen, modal, confirmRequest } = runtime;
  const empty = ScreenContent.isEmpty(screen.root, runtime.isVisible);
  const family = ScreenFamilyRegistry.forScreen(screen.screenId);
  const Template = ScreenTemplateRegistry.templateFor(family.key);

  const banners = <RuleBanners summary={runtime.summary} focusToken={runtime.summaryFocusToken} />;
  const body = empty ? (
    <EmptyState title="Sin contenido" description="Esta pantalla no tiene nada que mostrar por ahora." />
  ) : (
    <NodeRenderer node={screen.root} />
  );

  return (
    <div className="min-w-0" data-screen-id={screen.screenId} data-screen-family={family.key}>
      {embedded ? (
        <div className="flex min-w-0 flex-col gap-6">
          {banners}
          {body}
        </div>
      ) : (
        <Template
          title={screen.title}
          subtitle={screen.subtitle}
          familyTitle={family.title}
          clause={family.clause}
          stages={family.stages}
          currentStageId={screen.screenId}
          banners={banners}
        >
          {body}
        </Template>
      )}
      <ToastRegion toasts={runtime.toasts} onDismiss={runtime.dismissToast} />
      <Dialog
        open={confirmRequest !== null}
        title="Confirmar acción"
        description={confirmRequest?.text}
        onClose={() => runtime.resolveConfirm(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => runtime.resolveConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="secondary" onClick={() => runtime.resolveConfirm(true)}>
              Confirmar
            </Button>
          </>
        }
      />
      {modal !== null && renderModal ? renderModal(modal, runtime.closeModal) : null}
    </div>
  );
}
