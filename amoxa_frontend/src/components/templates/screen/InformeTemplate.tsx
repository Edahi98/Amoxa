import { FamilyHeader } from '@organisms/FamilyHeader.js';
import type { ScreenTemplateProps } from '@templates-screen/screen-template.types.js';

export function InformeTemplate({ title, subtitle, familyTitle, clause, stages, currentStageId, banners, children }: ScreenTemplateProps) {
  return (
    <div data-template="informe" className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6">
      <FamilyHeader
        title={title}
        subtitle={subtitle}
        familyTitle={familyTitle}
        clause={clause}
        stages={stages}
        currentStageId={currentStageId}
      />
      {banners}
      <article className="flex min-w-0 flex-col gap-6 rounded-2xl border border-border bg-card p-6 leading-relaxed shadow-sm md:p-10">
        {children}
      </article>
    </div>
  );
}
