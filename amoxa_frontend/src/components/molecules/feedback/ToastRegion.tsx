import { useEffect, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { ToneStyles, type Tone } from '@utils-style/ToneStyles.js';
import { ClassNames } from '@utils-style/cn.js';

export type ToastTone = Extract<Tone, 'info' | 'success' | 'warning' | 'danger'>;

export interface ToastMessage {
  id: string;
  message: string;
  tone: ToastTone;
}

export interface ToastRegionProps {
  toasts: readonly ToastMessage[];
  onDismiss: (id: string) => void;
  duration?: number;
  className?: string;
}

interface ToastItemProps {
  toast: ToastMessage;
  duration: number;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, duration, onDismiss }: ToastItemProps) {
  const [paused, setPaused] = useState(false);
  const ToneIcon = ToneStyles.icon(toast.tone);

  useEffect(() => {
    if (paused) {
      return;
    }
    const timer = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(timer);
  }, [paused, duration, toast.id, onDismiss]);

  return (
    <li
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={ClassNames.merge(
        'pointer-events-auto flex min-w-0 items-start gap-3 rounded-xl px-4 py-3 shadow-md',
        ToneStyles.soft(toast.tone),
      )}
    >
      <ToneIcon size={20} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" />
      <p className="min-w-0 flex-1 text-sm font-medium">
        <span className="sr-only">{ToneStyles.label(toast.tone)}: </span>
        {toast.message}
      </p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Cerrar notificación"
        className="-my-1 -mr-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors duration-200 hover:bg-black/10 focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/10"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </li>
  );
}

export function ToastRegion({ toasts, onDismiss, duration = 4000, className }: ToastRegionProps) {
  return (
    <div
      role="region"
      aria-label="Notificaciones"
      className={ClassNames.merge(
        'pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-4 sm:justify-end',
        className,
      )}
    >
      <ul role="status" aria-live="polite" aria-atomic="false" className="m-0 flex w-full max-w-sm list-none flex-col gap-2 p-0">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} duration={duration} onDismiss={onDismiss} />
        ))}
      </ul>
    </div>
  );
}
