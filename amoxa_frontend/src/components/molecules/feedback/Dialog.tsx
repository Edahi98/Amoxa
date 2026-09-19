import { useEffect, useId, useRef, type MouseEvent, type ReactNode, type SyntheticEvent } from 'react';
import { X } from '@phosphor-icons/react';
import { ClassNames } from '@utils-style/cn.js';

export interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  description?: string;
  footer?: ReactNode;
  id?: string;
  className?: string;
  children?: ReactNode;
}

export function Dialog({ open, title, onClose, description, footer, id, className, children }: DialogProps) {
  const generatedId = useId();
  const dialogId = id ?? generatedId;
  const titleId = `${dialogId}-title`;
  const descriptionId = `${dialogId}-description`;
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) {
      return;
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
      if (previouslyFocused && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onClose();
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      id={dialogId}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className={ClassNames.merge(
        'm-auto max-h-[calc(100dvh-2rem)] w-[min(40rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-slate-950/50',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
        <header className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id={titleId} className="text-lg font-semibold text-balance">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground transition-colors duration-200 hover:bg-muted focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="min-w-0">{children}</div>
        {footer ? <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">{footer}</footer> : null}
      </div>
    </dialog>
  );
}
