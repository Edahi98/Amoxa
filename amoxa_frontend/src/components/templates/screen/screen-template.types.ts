import type { ReactNode } from 'react';

export interface TemplateStage {
  id: string;
  label: string;
}

export interface ScreenTemplateProps {
  title: string;
  subtitle?: string;
  familyTitle: string;
  clause?: string;
  stages: readonly TemplateStage[];
  currentStageId: string;
  banners?: ReactNode;
  children: ReactNode;
}
