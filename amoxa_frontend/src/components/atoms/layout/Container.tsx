import type { ReactNode } from 'react';
import { ClassNames } from '@utils-style/cn.js';

export interface ContainerProps {
  children: ReactNode;
  className?: string;
}

export function Container({ children, className }: ContainerProps) {
  return <div className={ClassNames.merge('mx-auto w-full max-w-6xl px-6', className)}>{children}</div>;
}
