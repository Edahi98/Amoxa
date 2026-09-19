import { useId } from 'react';
import { NumberFormatter } from '@utils-format/NumberFormatter.js';
import { ToneStyles, type Tone } from '@utils-style/ToneStyles.js';
import { ClassNames } from '@utils-style/cn.js';

export interface ProgressBarProps {
  value: number;
  label?: string;
  tone?: Tone;
  id?: string;
  className?: string;
}

export function ProgressBar({ value, label, tone = 'primary', id, className }: ProgressBarProps) {
  const generatedId = useId();
  const barId = id ?? generatedId;
  const labelId = `${barId}-label`;
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

  return (
    <div className={ClassNames.merge('flex min-w-0 flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        {label ? (
          <span id={labelId} className="min-w-0 font-medium text-foreground">
            {label}
          </span>
        ) : (
          <span />
        )}
        <span className="shrink-0 font-semibold text-foreground tabular-nums">{NumberFormatter.percent(clamped)}</span>
      </div>
      <div
        id={barId}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        aria-valuetext={NumberFormatter.percent(clamped)}
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : 'Progreso'}
        className="h-2 w-full overflow-hidden rounded-full bg-muted ring-1 ring-inset ring-border"
      >
        <div
          className={ClassNames.merge('h-full w-full origin-left rounded-full transition-transform duration-200 motion-reduce:transition-none', ToneStyles.solid(tone))}
          style={{ transform: `scaleX(${clamped / 100})` }}
        />
      </div>
    </div>
  );
}
