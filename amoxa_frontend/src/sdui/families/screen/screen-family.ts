export const SCREEN_FAMILY_KEYS = [
  'home',
  'programa',
  'plantilla',
  'competencia',
  'seguimiento',
  'registro',
  'planificacion',
  'ejecucion',
  'informe',
  'accion',
] as const;

export type ScreenFamilyKey = (typeof SCREEN_FAMILY_KEYS)[number];

export interface ScreenFamilyStage {
  id: string;
  label: string;
}

export interface ScreenFamily {
  key: ScreenFamilyKey;
  title: string;
  clause?: string;
  screens: readonly string[];
  stages: readonly ScreenFamilyStage[];
}
