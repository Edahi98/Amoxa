import { ToneStyles, type Tone } from '@utils-style/ToneStyles.js';
import { ClassNames } from '@utils-style/cn.js';

export type BadgeTone = Tone;

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  id?: string;
  className?: string;
}

export function Badge({ label, tone = 'neutral', id, className }: BadgeProps) {
  const ToneIcon = ToneStyles.icon(tone);
  return (
    <span
      id={id}
      className={ClassNames.merge(
        'inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none',
        ToneStyles.soft(tone),
        className,
      )}
    >
      <ToneIcon size={14} weight="fill" aria-hidden="true" className="shrink-0" />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}
