import { ClassNames } from '@utils-style/cn.js';

export interface DividerProps {
  label?: string;
  id?: string;
  className?: string;
}

export function Divider({ label, id, className }: DividerProps) {
  if (!label) {
    return <hr id={id} className={ClassNames.merge('w-full border-0 border-t border-border', className)} />;
  }

  return (
    <div id={id} role="separator" aria-label={label} className={ClassNames.merge('flex w-full items-center gap-3', className)}>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  );
}
