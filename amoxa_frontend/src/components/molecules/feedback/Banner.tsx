import type { ReactNode } from 'react';
import { ToneStyles, type Tone } from '@utils-style/ToneStyles.js';
import { ClassNames } from '@utils-style/cn.js';

export type BannerTone = Extract<Tone, 'info' | 'success' | 'warning' | 'danger'>;

export interface BannerProps {
  tone: BannerTone;
  title?: string;
  message: string;
  action?: ReactNode;
  id?: string;
  className?: string;
}

export function Banner({ tone, title, message, action, id, className }: BannerProps) {
  const ToneIcon = ToneStyles.icon(tone);
  const urgent = tone === 'danger' || tone === 'warning';

  return (
    <div
      id={id}
      role={urgent ? 'alert' : 'status'}
      className={ClassNames.merge(
        'flex min-w-0 flex-wrap items-start gap-3 rounded-xl px-4 py-3',
        ToneStyles.soft(tone),
        className,
      )}
    >
      <ToneIcon size={22} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" />
      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
        <p className="text-sm font-semibold">
          <span className="sr-only">{ToneStyles.label(tone)}: </span>
          {title ?? ToneStyles.label(tone)}
        </p>
        <p className="text-sm">{message}</p>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}
