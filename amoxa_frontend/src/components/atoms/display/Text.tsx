import type { ElementType, ReactNode } from 'react';
import { ClassNames } from '@utils-style/cn.js';

export type TextVariant = 'title' | 'heading' | 'body' | 'caption' | 'label';
export type TextTone = 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'danger';
export type TextElement = 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface TextProps {
  text?: string;
  variant?: TextVariant;
  tone?: TextTone;
  as?: TextElement;
  id?: string;
  className?: string;
  children?: ReactNode;
}

export class TextStyles {
  private static readonly VARIANT: Record<TextVariant, string> = {
    title: 'text-2xl font-bold tracking-tight text-balance',
    heading: 'text-lg font-semibold text-balance',
    body: 'text-base leading-relaxed',
    caption: 'text-xs leading-normal',
    label: 'text-sm font-medium',
  };

  private static readonly ELEMENT: Record<TextVariant, TextElement> = {
    title: 'h2',
    heading: 'h3',
    body: 'p',
    caption: 'p',
    label: 'span',
  };

  private static readonly TONE: Record<TextTone, string> = {
    default: 'text-foreground',
    muted: 'text-muted-foreground',
    primary: 'text-on-primary-muted',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
  };

  public static classes(variant: TextVariant, tone: TextTone | undefined, className?: string): string {
    const resolved = tone ?? (variant === 'caption' ? 'muted' : 'default');
    return ClassNames.merge('min-w-0 break-words', TextStyles.VARIANT[variant], TextStyles.TONE[resolved], className);
  }

  public static element(variant: TextVariant, as?: TextElement): TextElement {
    return as ?? TextStyles.ELEMENT[variant];
  }
}

export function Text({ text, variant = 'body', tone, as, id, className, children }: TextProps) {
  const Element: ElementType = TextStyles.element(variant, as);
  return (
    <Element id={id} className={TextStyles.classes(variant, tone, className)}>
      {children ?? text}
    </Element>
  );
}
