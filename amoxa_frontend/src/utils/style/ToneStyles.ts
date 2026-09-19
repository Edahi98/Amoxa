import {
  CheckCircle,
  Circle,
  CircleHalf,
  Info,
  Warning,
  XCircle,
  type Icon,
} from '@phosphor-icons/react';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export class ToneStyles {
  public static readonly TONES: readonly Tone[] = ['neutral', 'primary', 'success', 'warning', 'danger', 'info'];

  private static readonly SOFT: Record<Tone, string> = {
    neutral: 'bg-muted text-foreground ring-1 ring-inset ring-border',
    primary: 'bg-primary-muted text-on-primary-muted ring-1 ring-inset ring-on-primary-muted/25',
    success: 'bg-success-muted text-on-success-muted ring-1 ring-inset ring-on-success-muted/25',
    warning: 'bg-warning-muted text-on-warning-muted ring-1 ring-inset ring-on-warning-muted/25',
    danger: 'bg-destructive-muted text-on-destructive-muted ring-1 ring-inset ring-on-destructive-muted/25',
    info: 'bg-info-muted text-on-info-muted ring-1 ring-inset ring-on-info-muted/25',
  };

  private static readonly TEXT: Record<Tone, string> = {
    neutral: 'text-foreground',
    primary: 'text-on-primary-muted',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
    info: 'text-info',
  };

  private static readonly SOLID: Record<Tone, string> = {
    neutral: 'bg-foreground',
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-destructive',
    info: 'bg-info',
  };

  private static readonly ICONS: Record<Tone, Icon> = {
    neutral: Circle,
    primary: CircleHalf,
    success: CheckCircle,
    warning: Warning,
    danger: XCircle,
    info: Info,
  };

  private static readonly LABELS: Record<Tone, string> = {
    neutral: 'Neutral',
    primary: 'Destacado',
    success: 'Correcto',
    warning: 'Advertencia',
    danger: 'Error',
    info: 'Información',
  };

  public static soft(tone: Tone): string {
    return ToneStyles.SOFT[tone];
  }

  public static text(tone: Tone): string {
    return ToneStyles.TEXT[tone];
  }

  public static solid(tone: Tone): string {
    return ToneStyles.SOLID[tone];
  }

  public static icon(tone: Tone): Icon {
    return ToneStyles.ICONS[tone];
  }

  public static label(tone: Tone): string {
    return ToneStyles.LABELS[tone];
  }
}
