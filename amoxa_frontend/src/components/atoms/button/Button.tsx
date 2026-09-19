import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Icon } from '@phosphor-icons/react';
import { ClassNames } from '@utils-style/cn.js';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: Icon;
  children?: ReactNode;
}

export class ButtonStyles {
  private static readonly VARIANT_CLASSES: Record<ButtonVariant, string> = {
    primary: 'bg-accent text-on-accent hover:bg-accent/90',
    secondary: 'bg-primary text-on-primary hover:bg-primary/90',
    outline: 'border border-border bg-card text-foreground hover:bg-muted',
    ghost: 'text-foreground hover:bg-muted',
    danger: 'bg-destructive text-on-destructive hover:bg-destructive/90',
  };

  private static readonly SIZE_CLASSES: Record<ButtonSize, string> = {
    md: 'h-11 px-5 text-sm',
    lg: 'h-14 px-7 text-base',
  };

  public static classes(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string): string {
    return ClassNames.merge(
      'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-200 focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      ButtonStyles.VARIANT_CLASSES[variant],
      ButtonStyles.SIZE_CLASSES[size],
      className,
    );
  }
}

export function Button({ variant = 'primary', size = 'md', icon: LeadingIcon, className, children, ...rest }: ButtonProps) {
  return (
    <button type="button" className={ButtonStyles.classes(variant, size, className)} {...rest}>
      {LeadingIcon ? <LeadingIcon size={18} weight="bold" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
