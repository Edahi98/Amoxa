import axolotl from '@assets/lindo-ajolote.png';
import { ClassNames } from '@utils-style/cn.js';

export interface NavLockedProps {
  label: string;
  hint?: string;
  className?: string;
}

export function NavLocked({ label, hint, className }: NavLockedProps) {
  return (
    <div
      role="group"
      aria-disabled="true"
      aria-label={hint ? `${label}, bloqueado. ${hint}` : `${label}, bloqueado`}
      className={ClassNames.merge(
        'flex min-h-11 w-full select-none items-center gap-3 rounded-lg border border-[#f7b3c2]/25 bg-[linear-gradient(135deg,rgba(247,179,194,0.28)_0%,rgba(238,142,154,0.14)_100%)] px-3 py-1.5 text-[#fde4ea]',
        className,
      )}
    >
      <img src={axolotl} alt="" width={28} height={28} className="size-7 shrink-0 object-contain" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-medium leading-tight lg:text-sm">{label}</span>
        {hint ? <span className="text-xs leading-tight text-[#f7c9d3]">{hint}</span> : null}
      </span>
    </div>
  );
}
