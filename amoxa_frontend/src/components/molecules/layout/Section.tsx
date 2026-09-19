import { useId, type ReactNode } from 'react';
import { ClassNames } from '@utils-style/cn.js';

export interface SectionProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  id?: string;
  className?: string;
  children?: ReactNode;
}

export function Section({ title, description, actions, id, className, children }: SectionProps) {
  const generatedId = useId();
  const titleId = `${id ?? generatedId}-title`;

  return (
    <section
      id={id}
      aria-labelledby={title ? titleId : undefined}
      className={ClassNames.merge('flex min-w-0 flex-col gap-4', className)}
    >
      {title || description || actions ? (
        <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            {title ? (
              <h2 id={titleId} className="text-2xl font-bold tracking-tight text-balance text-foreground">
                {title}
              </h2>
            ) : null}
            {description ? <p className="max-w-prose text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
