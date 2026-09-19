import type { ButtonHTMLAttributes } from 'react';
import { CaretRight, type Icon } from '@phosphor-icons/react';
import { CardStyles } from '@molecules-layout/Card.js';

export interface NavTileProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  title: string;
  description?: string;
  icon?: Icon;
}

export class NavTileStyles {
  public static readonly BASE =
    'group min-h-20 w-full cursor-pointer flex-row items-center gap-4 p-4 text-left transition-[box-shadow,background-color] duration-200 hover:bg-white/90 hover:shadow-lg focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none dark:hover:bg-slate-700/70';

  public static classes(className?: string): string {
    return CardStyles.classes('glass', className ? `${NavTileStyles.BASE} ${className}` : NavTileStyles.BASE);
  }
}

export function NavTile({ title, description, icon: TileIcon, className, ...rest }: NavTileProps) {
  return (
    <button type="button" className={NavTileStyles.classes(className)} {...rest}>
      {TileIcon ? <TileIcon size={24} weight="regular" aria-hidden="true" className="shrink-0 text-on-primary-muted" /> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-base font-semibold text-foreground">{title}</span>
        {description ? <span className="text-base text-muted-foreground md:text-sm">{description}</span> : null}
      </span>
      <CaretRight size={18} aria-hidden="true" className="shrink-0 text-muted-foreground" />
    </button>
  );
}
