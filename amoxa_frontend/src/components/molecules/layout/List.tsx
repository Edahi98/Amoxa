import { Children, type ReactNode } from 'react';
import { ClassNames } from '@utils-style/cn.js';

export type ListVariant = 'plain' | 'divided';

export interface ListProps {
  variant?: ListVariant;
  emptyText?: string;
  id?: string;
  className?: string;
  children?: ReactNode;
}

export function List({ variant = 'plain', emptyText = 'Sin elementos para mostrar.', id, className, children }: ListProps) {
  const items = Children.toArray(children);

  if (items.length === 0) {
    return (
      <p id={id} className={ClassNames.merge('text-sm text-muted-foreground', className)}>
        {emptyText}
      </p>
    );
  }

  return (
    <ul
      id={id}
      role="list"
      className={ClassNames.merge(
        'm-0 flex min-w-0 list-none flex-col p-0',
        variant === 'divided' ? 'divide-y divide-border' : 'gap-2',
        className,
      )}
    >
      {items.map((item, index) => (
        <li key={index} className={ClassNames.merge('min-w-0', variant === 'divided' && 'py-3 first:pt-0 last:pb-0')}>
          {item}
        </li>
      ))}
    </ul>
  );
}
