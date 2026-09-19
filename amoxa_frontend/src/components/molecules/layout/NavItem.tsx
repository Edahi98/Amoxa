import type { ButtonHTMLAttributes } from 'react';
import { useLocation } from 'react-router-dom';
import type { Icon } from '@phosphor-icons/react';
import { ClassNames } from '@utils-style/cn.js';
import { ScreenRoute } from '@sdui-runtime-screen/screen-route';

export interface NavItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  target?: string;
  icon?: Icon;
}

export class NavItemState {
  public static isActive(pathname: string, target: string | undefined): boolean {
    if (target === undefined) return false;
    if (target === ScreenRoute.HOME_SCREEN) return pathname === ScreenRoute.HOME_PATH;
    return pathname === `/app/${encodeURIComponent(target)}`;
  }
}

export function NavItem({ label, target, icon: ItemIcon, className, ...rest }: NavItemProps) {
  const { pathname } = useLocation();
  const active = NavItemState.isActive(pathname, target);

  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      className={ClassNames.merge(
        'flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-base transition-colors duration-200 focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 lg:text-sm',
        active ? 'bg-primary-muted font-semibold text-on-primary-muted' : 'font-medium text-foreground hover:bg-muted',
        className,
      )}
      {...rest}
    >
      {ItemIcon ? <ItemIcon size={20} weight={active ? 'fill' : 'regular'} aria-hidden="true" className="shrink-0" /> : null}
      <span className="min-w-0 flex-1">{label}</span>
    </button>
  );
}
