import type { ReactNode } from 'react';
import { Tray } from '@phosphor-icons/react';
import { ClassNames } from '@utils-style/cn.js';

export interface EmptyStateProps {
  title: string;
  description?: string;
  id?: string;
  className?: string;
  children?: ReactNode;
}

export function EmptyState({ title, description, id, className, children }: EmptyStateProps) {
  return (
    <div
      id={id}
      className={ClassNames.merge(
        'flex min-w-0 flex-col items-center gap-3 rounded-xl border border-dashed border-input px-6 py-10 text-center',
        className,
      )}
    >
      <Tray size={32} aria-hidden="true" className="text-muted-foreground" />
      <div className="flex max-w-prose flex-col gap-1">
        <p className="text-lg font-semibold text-foreground text-balance">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{children}</div> : null}
    </div>
  );
}
