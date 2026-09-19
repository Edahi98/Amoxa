import { ArrowDown, ArrowUp, Minus, type Icon } from '@phosphor-icons/react';
import { NumberFormatter } from '@utils-format/NumberFormatter.js';
import { ToneStyles, type Tone } from '@utils-style/ToneStyles.js';
import { ClassNames } from '@utils-style/cn.js';

export type KpiTrend = 'up' | 'down' | 'flat';

export interface KpiProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string | number;
  trend?: KpiTrend;
  tone?: Tone;
  icon?: Icon;
  id?: string;
  className?: string;
}

export class KpiModel {
  private static readonly ICONS: Record<KpiTrend, Icon> = { up: ArrowUp, down: ArrowDown, flat: Minus };

  private static readonly TEXT: Record<KpiTrend, string> = { up: 'Sube', down: 'Baja', flat: 'Sin cambio' };

  public static icon(trend: KpiTrend): Icon {
    return KpiModel.ICONS[trend];
  }

  public static text(trend: KpiTrend): string {
    return KpiModel.TEXT[trend];
  }

  public static formatValue(value: string | number): string {
    return typeof value === 'number' ? NumberFormatter.format(value) : value;
  }
}

export function Kpi({ label, value, unit, delta, trend, tone = 'neutral', icon: KpiIcon, id, className }: KpiProps) {
  const TrendIcon = trend ? KpiModel.icon(trend) : null;

  return (
    <div id={id} className={ClassNames.merge('flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-4', className)}>
      <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {KpiIcon ? <KpiIcon size={20} aria-hidden="true" className="shrink-0 text-on-primary-muted" /> : null}
        {label}
      </p>
      <p className="flex min-w-0 flex-wrap items-baseline gap-1.5">
        <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">{KpiModel.formatValue(value)}</span>
        {unit ? <span className="text-sm font-medium text-muted-foreground">{unit}</span> : null}
      </p>
      {delta !== undefined || trend ? (
        <p className={ClassNames.merge('flex items-center gap-1 text-sm font-semibold tabular-nums', ToneStyles.text(tone))}>
          {TrendIcon ? <TrendIcon size={16} weight="bold" aria-hidden="true" /> : null}
          {trend ? <span className="sr-only">{KpiModel.text(trend)}: </span> : null}
          {delta !== undefined ? <span>{typeof delta === 'number' ? NumberFormatter.format(delta) : delta}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
