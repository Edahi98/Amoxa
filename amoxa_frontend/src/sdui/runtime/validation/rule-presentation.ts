import type { RuleSeverity } from '@sdui-model/sdui-enums';
import type { RuleSummaryEntry } from '@sdui-runtime-validation/validation-presenter';

export type RuleTone = 'danger' | 'warning' | 'info';

export interface RuleGroup {
  severity: RuleSeverity;
  tone: RuleTone;
  title: string;
  message: string;
  entries: RuleSummaryEntry[];
}

interface SeverityPresentation {
  severity: RuleSeverity;
  tone: RuleTone;
  title: string;
  single: string;
  plural: (count: number) => string;
}

export class RulePresentation {
  private static readonly SEVERITIES: readonly SeverityPresentation[] = [
    {
      severity: 'block',
      tone: 'danger',
      title: 'No se puede continuar',
      single: 'Corrige este punto antes de continuar.',
      plural: (count) => `Corrige estos ${count} puntos antes de continuar.`,
    },
    {
      severity: 'warn',
      tone: 'warning',
      title: 'Revisa antes de seguir',
      single: 'Hay una advertencia.',
      plural: (count) => `Hay ${count} advertencias.`,
    },
    {
      severity: 'info',
      tone: 'info',
      title: 'Información',
      single: 'Hay un aviso.',
      plural: (count) => `Hay ${count} avisos.`,
    },
  ];

  public static groups(summary: readonly RuleSummaryEntry[]): RuleGroup[] {
    return RulePresentation.SEVERITIES.flatMap((presentation): RuleGroup[] => {
      const entries = summary.filter((entry) => entry.rule.severity === presentation.severity);
      if (entries.length === 0) return [];
      return [
        {
          severity: presentation.severity,
          tone: presentation.tone,
          title: presentation.title,
          message: entries.length === 1 ? presentation.single : presentation.plural(entries.length),
          entries,
        },
      ];
    });
  }
}
