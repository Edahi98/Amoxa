import { useId, type ReactNode } from 'react';
import { ClassNames } from '@utils-style/cn.js';

export type CardTone = 'default' | 'muted' | 'glass';
export type CardElement = 'div' | 'section' | 'article';

export interface CardProps {
  title?: string;
  subtitle?: string;
  tone?: CardTone;
  footer?: ReactNode;
  as?: CardElement;
  id?: string;
  className?: string;
  children?: ReactNode;
}

export class CardStyles {
  private static readonly TONE: Record<CardTone, string> = {
    default: 'border border-border bg-card text-card-foreground',
    muted: 'border border-border bg-muted text-foreground',
    glass:
      'border border-white/60 bg-white/70 text-foreground shadow-[0_4px_16px_-4px_rgb(15_23_42/0.14)] backdrop-blur-md dark:border-white/10 dark:bg-slate-800/70',
  };

  public static classes(tone: CardTone, className?: string): string {
    return ClassNames.merge('flex min-w-0 flex-col gap-4 rounded-xl p-5', CardStyles.TONE[tone], className);
  }
}

export function Card({ title, subtitle, tone = 'default', footer, as = 'div', id, className, children }: CardProps) {
  const generatedId = useId();
  const titleId = `${id ?? generatedId}-title`;
  const Element = as;
  const labelledBy = title && as !== 'div' ? titleId : undefined;

  return (
    <Element id={id} aria-labelledby={labelledBy} className={CardStyles.classes(tone, className)}>
      {title || subtitle ? (
        <header className="flex min-w-0 flex-col gap-1">
          {title ? (
            <h3 id={titleId} className="text-lg font-semibold text-balance">
              {title}
            </h3>
          ) : null}
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </header>
      ) : null}
      {children}
      {footer ? <footer className="mt-auto flex min-w-0 flex-wrap items-center gap-2 border-t border-border pt-4">{footer}</footer> : null}
    </Element>
  );
}
