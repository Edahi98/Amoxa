import { CaretRight } from '@phosphor-icons/react';
import { ClassNames } from '@utils-style/cn.js';

export interface StageStepperItem {
  id: string;
  label: string;
}

export interface StageStepperProps {
  stages: readonly StageStepperItem[];
  currentId: string;
  label: string;
  className?: string;
}

export function StageStepper({ stages, currentId, label, className }: StageStepperProps) {
  const currentIndex = stages.findIndex((stage) => stage.id === currentId);
  if (stages.length === 0 || currentIndex < 0) return null;

  return (
    <nav aria-label={label} className={ClassNames.merge('min-w-0', className)}>
      <p className="text-sm font-medium text-muted-foreground md:hidden">
        <span className="tabular-nums">
          Paso {currentIndex + 1} de {stages.length}
        </span>
        <span aria-hidden="true"> · </span>
        <span className="font-semibold text-foreground">{stages[currentIndex].label}</span>
      </p>
      <ol className="hidden flex-wrap items-center gap-x-1 gap-y-2 md:flex">
        {stages.map((stage, index) => {
          const current = index === currentIndex;
          return (
            <li key={stage.id} className="flex items-center gap-1">
              <span
                aria-current={current ? 'step' : undefined}
                className={ClassNames.merge(
                  'flex min-h-8 items-center gap-2 rounded-full px-3 text-sm',
                  current ? 'bg-primary-muted font-semibold text-on-primary-muted' : 'text-muted-foreground',
                )}
              >
                <span className="tabular-nums">{index + 1}</span>
                <span>{stage.label}</span>
              </span>
              {index < stages.length - 1 ? (
                <CaretRight size={14} weight="bold" aria-hidden="true" className="text-muted-foreground" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
