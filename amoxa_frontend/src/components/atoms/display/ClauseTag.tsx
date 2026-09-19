import { BookOpenText } from '@phosphor-icons/react';
import { ClassNames } from '@utils-style/cn.js';

export interface ClauseTagProps {
  clause: string;
  standard?: string;
  title?: string;
  id?: string;
  className?: string;
}

export function ClauseTag({ clause, standard, title, id, className }: ClauseTagProps) {
  const reference = standard ? `${standard} · ${clause}` : `Cláusula ${clause}`;
  return (
    <span
      id={id}
      className={ClassNames.merge(
        'inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground',
        className,
      )}
    >
      <BookOpenText size={14} aria-hidden="true" className="shrink-0 text-muted-foreground" />
      <span className="shrink-0 font-semibold tabular-nums">{reference}</span>
      {title ? <span className="min-w-0 truncate text-muted-foreground">{title}</span> : null}
    </span>
  );
}
