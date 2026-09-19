import type { ReactNode } from 'react';
import { Gear, Paperclip, Warning } from '@phosphor-icons/react';
import { Badge } from '@atoms-display/Badge.js';
import { ClauseTag } from '@atoms-display/ClauseTag.js';
import { RecordCard, type RecordDetail } from '@molecules-audit/RecordCard.js';
import type { Tone } from '@utils-style/ToneStyles.js';

export type FindingKind = 'nc_mayor' | 'nc_menor' | 'observacion' | 'oportunidad';

export interface FindingCardProps {
  title: string;
  description?: string;
  kind: FindingKind;
  clause?: string;
  process?: string;
  status?: string;
  evidenceCount?: number;
  onPress?: () => void;
  footer?: ReactNode;
  id?: string;
  className?: string;
}

export class FindingModel {
  private static readonly LABELS: Record<FindingKind, string> = {
    nc_mayor: 'No conformidad mayor',
    nc_menor: 'No conformidad menor',
    observacion: 'Observación',
    oportunidad: 'Oportunidad de mejora',
  };

  private static readonly TONES: Record<FindingKind, Tone> = {
    nc_mayor: 'danger',
    nc_menor: 'warning',
    observacion: 'info',
    oportunidad: 'primary',
  };

  public static label(kind: FindingKind): string {
    return FindingModel.LABELS[kind];
  }

  public static tone(kind: FindingKind): Tone {
    return FindingModel.TONES[kind];
  }

  public static isNonConformity(kind: FindingKind): boolean {
    return kind === 'nc_mayor' || kind === 'nc_menor';
  }

  public static evidenceText(count: number): string {
    if (count === 0) {
      return 'Sin evidencia adjunta';
    }
    return `${count} ${count === 1 ? 'evidencia adjunta' : 'evidencias adjuntas'}`;
  }
}

export function FindingCard({
  title,
  description,
  kind,
  clause,
  process,
  status,
  evidenceCount,
  onPress,
  footer,
  id,
  className,
}: FindingCardProps) {
  const details: RecordDetail[] = [];
  if (process) {
    details.push({ icon: Gear, label: 'Proceso', text: process });
  }
  if (evidenceCount !== undefined) {
    details.push({ icon: Paperclip, label: 'Evidencia', text: FindingModel.evidenceText(evidenceCount) });
  }
  const missingEvidence = FindingModel.isNonConformity(kind) && (evidenceCount ?? 0) === 0;

  return (
    <RecordCard
      id={id}
      className={className}
      title={title}
      description={description}
      details={details}
      onPress={onPress}
      footer={footer}
      badges={
        <>
          <Badge label={FindingModel.label(kind)} tone={FindingModel.tone(kind)} />
          {status ? <Badge label={status} tone="neutral" /> : null}
        </>
      }
    >
      {clause ? <ClauseTag clause={clause} standard="ISO 9001" /> : null}
      {missingEvidence ? (
        <p className="flex items-start gap-2 rounded-lg bg-warning-muted px-3 py-2 text-sm font-medium text-on-warning-muted">
          <Warning size={16} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>Una no conformidad requiere evidencia antes de registrarse.</span>
        </p>
      ) : null}
    </RecordCard>
  );
}
