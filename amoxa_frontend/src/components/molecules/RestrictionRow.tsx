import { Prohibit } from '@phosphor-icons/react';

export interface RestrictionRowProps {
  text: string;
}

export function RestrictionRow({ text }: RestrictionRowProps) {
  return (
    <li className="flex items-start gap-3 border-b border-white/40 py-4 last:border-none dark:border-white/10">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <Prohibit size={14} weight="bold" aria-hidden="true" />
      </span>
      <span className="text-sm leading-relaxed text-foreground">{text}</span>
    </li>
  );
}
