import { FamilyHeader } from '@organisms/FamilyHeader.js';
import type { ScreenTemplateProps } from '@templates-screen/screen-template.types.js';

export function EjecucionTemplate({ title, subtitle, familyTitle, clause, stages, currentStageId, banners, children }: ScreenTemplateProps) {
  return (
    <div data-template="ejecucion" className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6">
      <FamilyHeader
        title={title}
        subtitle={subtitle}
        familyTitle={familyTitle}
        clause={clause}
        stages={stages}
        currentStageId={currentStageId}
        stickyStages
      />
      {banners}
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </div>
  );
}
