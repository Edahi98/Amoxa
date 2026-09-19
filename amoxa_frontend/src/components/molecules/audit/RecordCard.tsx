import { useId, type ReactNode } from 'react';
import type { Icon } from '@phosphor-icons/react';
import { ClassNames } from '@utils-style/cn.js';

export interface RecordDetail {
  icon: Icon;
  label: string;
  text: string;
}

export interface RecordCardProps {
  title: string;
  badges?: ReactNode;
  description?: string;
  details?: RecordDetail[];
  onPress?: () => void;
  footer?: ReactNode;
  id?: string;
  className?: string;
  children?: ReactNode;
}

export function RecordCard({ title, badges, description, details, onPress, footer, id, className, children }: RecordCardProps) {
  const generatedId = useId();
  const titleId = `${id ?? generatedId}-title`;
  const pressable = typeof onPress === 'function';

  return (
    <article
      id={id}
      aria-labelledby={titleId}
      className={ClassNames.merge(
        'relative flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors duration-200 has-[h3_button:focus-visible]:outline-2 has-[h3_button:focus-visible]:outline-offset-2 has-[h3_button:focus-visible]:outline-ring',
        pressable && 'hover:bg-muted',
        className,
      )}
    >
      {badges ? <div className="flex min-w-0 flex-wrap items-center gap-2">{badges}</div> : null}
      <h3 id={titleId} className="min-w-0 text-lg font-semibold text-balance text-foreground">
        {pressable ? (
          <button
            type="button"
            onClick={onPress}
            className="cursor-pointer text-left after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none"
          >
            {title}
          </button>
        ) : (
          title
        )}
      </h3>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {details && details.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm text-foreground">
          {details.map((detail) => {
            const DetailIcon = detail.icon;
            return (
              <li key={detail.label} className="flex min-w-0 items-start gap-2">
                <DetailIcon size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 break-words">
                  <span className="sr-only">{detail.label}: </span>
                  {detail.text}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {children}
      {footer ? <div className="relative z-10 flex min-w-0 flex-wrap items-center gap-2 border-t border-border pt-3">{footer}</div> : null}
    </article>
  );
}
