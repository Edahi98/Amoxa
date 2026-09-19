import type { ReactNode } from 'react';
import { ClassNames } from '@utils-style/cn.js';

export type StackDirection = 'column' | 'row';
export type StackGap = 'sm' | 'md' | 'lg';
export type StackAlign = 'start' | 'center' | 'end' | 'stretch';

export interface StackProps {
  direction?: StackDirection;
  gap?: StackGap;
  align?: StackAlign;
  wrap?: boolean;
  id?: string;
  className?: string;
  children?: ReactNode;
}

export class StackStyles {
  private static readonly GAP: Record<StackGap, string> = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  private static readonly ALIGN: Record<StackAlign, string> = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  public static classes(direction: StackDirection, gap: StackGap, align: StackAlign, wrap: boolean, className?: string): string {
    return ClassNames.merge(
      'flex min-w-0 [&>*]:min-w-0',
      direction === 'row' ? 'flex-row' : 'flex-col',
      StackStyles.GAP[gap],
      StackStyles.ALIGN[align],
      wrap && 'flex-wrap',
      className,
    );
  }
}

export function Stack({ direction = 'column', gap = 'md', align = 'stretch', wrap = false, id, className, children }: StackProps) {
  return (
    <div id={id} className={StackStyles.classes(direction, gap, align, wrap, className)}>
      {children}
    </div>
  );
}
