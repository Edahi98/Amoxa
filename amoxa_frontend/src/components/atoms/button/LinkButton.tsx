import type { ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { ButtonStyles, type ButtonSize, type ButtonVariant } from '@atoms-button/Button.js';

export interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function LinkButton({ variant = 'primary', size = 'md', className, children, ...rest }: LinkButtonProps) {
  return (
    <Link className={ButtonStyles.classes(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
