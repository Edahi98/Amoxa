import { ClauseTag } from '@atoms-display/ClauseTag.js';
import { StageStepper } from '@molecules/StageStepper.js';
import { ClassNames } from '@utils-style/cn.js';
import type { ScreenTemplateProps } from '@templates-screen/screen-template.types.js';

export interface FamilyHeaderProps
  extends Pick<ScreenTemplateProps, 'title' | 'subtitle' | 'familyTitle' | 'clause' | 'stages' | 'currentStageId'> {
  stickyStages?: boolean;
  className?: string;
}

export function FamilyHeader({
  title,
  subtitle,
  familyTitle,
  clause,
  stages,
  currentStageId,
  stickyStages = false,
  className,
}: FamilyHeaderProps) {
  const hasStages = stages.length > 0;

  return (
    <header className={ClassNames.merge('flex min-w-0 flex-col gap-3', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-balance text-foreground md:text-3xl">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
        <span>{familyTitle}</span>
        {clause ? <ClauseTag clause={clause} /> : null}
      </div>
      {hasStages ? (
        <div
          className={ClassNames.merge(
            stickyStages && 'sticky top-0 z-10 -mx-1 border-b border-border bg-background/90 px-1 py-2 backdrop-blur-md',
          )}
        >
          <StageStepper stages={stages} currentId={currentStageId} label={`Etapas: ${familyTitle}`} />
        </div>
      ) : null}
    </header>
  );
}
