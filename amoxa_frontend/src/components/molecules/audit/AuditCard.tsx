import type { ReactNode } from 'react';
import { CalendarBlank, Crosshair, UserCircle, VideoCamera, Buildings, Shuffle, type Icon } from '@phosphor-icons/react';
import { Badge } from '@atoms-display/Badge.js';
import { RecordCard, type RecordDetail } from '@molecules-audit/RecordCard.js';
import { DateFormatter } from '@utils-format/DateFormatter.js';

export type AuditMethod = 'in_situ' | 'remoto' | 'mixto';

export interface AuditCardProps {
  title: string;
  scope?: string;
  method?: AuditMethod;
  startDate?: string;
  endDate?: string;
  status?: string;
  leader?: string;
  onPress?: () => void;
  footer?: ReactNode;
  id?: string;
  className?: string;
}

export class AuditModel {
  private static readonly LABELS: Record<AuditMethod, string> = {
    in_situ: 'In situ',
    remoto: 'Remoto',
    mixto: 'Mixto',
  };

  private static readonly ICONS: Record<AuditMethod, Icon> = {
    in_situ: Buildings,
    remoto: VideoCamera,
    mixto: Shuffle,
  };

  public static label(method: AuditMethod): string {
    return AuditModel.LABELS[method];
  }

  public static icon(method: AuditMethod): Icon {
    return AuditModel.ICONS[method];
  }
}

export function AuditCard({ title, scope, method, startDate, endDate, status, leader, onPress, footer, id, className }: AuditCardProps) {
  const details: RecordDetail[] = [];
  if (scope) {
    details.push({ icon: Crosshair, label: 'Alcance', text: scope });
  }
  if (method) {
    details.push({ icon: AuditModel.icon(method), label: 'Método', text: AuditModel.label(method) });
  }
  const range = DateFormatter.range(startDate, endDate);
  if (range) {
    details.push({ icon: CalendarBlank, label: 'Fechas', text: range });
  }
  if (leader) {
    details.push({ icon: UserCircle, label: 'Auditor líder', text: leader });
  }

  return (
    <RecordCard
      id={id}
      className={className}
      title={title}
      details={details}
      onPress={onPress}
      footer={footer}
      badges={status ? <Badge label={status} tone="primary" /> : undefined}
    />
  );
}
