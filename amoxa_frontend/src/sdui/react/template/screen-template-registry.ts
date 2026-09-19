import type { ComponentType } from 'react';
import { AccionTemplate } from '@templates-screen/AccionTemplate.js';
import { CompetenciaTemplate } from '@templates-screen/CompetenciaTemplate.js';
import { EjecucionTemplate } from '@templates-screen/EjecucionTemplate.js';
import { HomeTemplate } from '@templates-screen/HomeTemplate.js';
import { InformeTemplate } from '@templates-screen/InformeTemplate.js';
import { PlanificacionTemplate } from '@templates-screen/PlanificacionTemplate.js';
import { PlantillaTemplate } from '@templates-screen/PlantillaTemplate.js';
import { ProgramaTemplate } from '@templates-screen/ProgramaTemplate.js';
import { RegistroTemplate } from '@templates-screen/RegistroTemplate.js';
import { SeguimientoTemplate } from '@templates-screen/SeguimientoTemplate.js';
import type { ScreenTemplateProps } from '@templates-screen/screen-template.types.js';
import type { ScreenFamilyKey } from '@sdui-families-screen/screen-family';

export class ScreenTemplateRegistry {
  private static readonly TEMPLATES: Readonly<Record<ScreenFamilyKey, ComponentType<ScreenTemplateProps>>> = {
    home: HomeTemplate,
    programa: ProgramaTemplate,
    plantilla: PlantillaTemplate,
    competencia: CompetenciaTemplate,
    seguimiento: SeguimientoTemplate,
    registro: RegistroTemplate,
    planificacion: PlanificacionTemplate,
    ejecucion: EjecucionTemplate,
    informe: InformeTemplate,
    accion: AccionTemplate,
  };

  public static templateFor(key: ScreenFamilyKey): ComponentType<ScreenTemplateProps> {
    return ScreenTemplateRegistry.TEMPLATES[key];
  }
}
