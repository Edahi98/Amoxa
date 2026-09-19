import type { ReactNode } from 'react';
import { ClassNames } from '@utils-style/cn.js';

export type GridColumns = 1 | 2 | 3 | 4;
export type GridGap = 'sm' | 'md' | 'lg';

export interface GridProps {
  columns?: GridColumns;
  gap?: GridGap;
  id?: string;
  className?: string;
  children?: ReactNode;
}

export class GridStyles {
  private static readonly COLUMNS: Record<GridColumns, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  };

  private static readonly GAP: Record<GridGap, string> = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  public static classes(columns: GridColumns, gap: GridGap, className?: string): string {
    return ClassNames.merge('grid min-w-0 [&>*]:min-w-0', GridStyles.COLUMNS[columns], GridStyles.GAP[gap], className);
  }
}

export function Grid({ columns = 3, gap = 'md', id, className, children }: GridProps) {
  return (
    <div id={id} className={GridStyles.classes(columns, gap, className)}>
      {children}
    </div>
  );
}
