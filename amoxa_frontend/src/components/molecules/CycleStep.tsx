import type { Icon } from '@phosphor-icons/react';

export interface CycleStepProps {
  icon: Icon;
  phase: string;
  title: string;
  items: string[];
  align: 'left' | 'right';
}

export function CycleStep({ icon: IconComponent, phase, title, items, align }: CycleStepProps) {
  return (
    <div className={align === 'right' ? 'md:ml-auto md:text-right' : ''}>
      <div className={`flex items-center gap-3 ${align === 'right' ? 'md:flex-row-reverse' : ''}`}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-white/70 text-primary shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-800/70">
          <IconComponent size={24} weight="regular" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-medium text-primary">{phase}</p>
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        </div>
      </div>
      <ul className={`mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground ${align === 'right' ? 'md:items-end' : ''} flex flex-col`}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
