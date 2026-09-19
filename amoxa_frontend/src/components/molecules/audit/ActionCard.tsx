import type { ReactNode } from 'react';
import { CalendarBlank, ShieldCheck, User } from '@phosphor-icons/react';
import { Badge } from '@atoms-display/Badge.js';
import { RecordCard, type RecordDetail } from '@molecules-audit/RecordCard.js';
import { DateFormatter } from '@utils-format/DateFormatter.js';
import type { Tone } from '@utils-style/ToneStyles.js';

export type ActionStatus = 'abierta' | 'reportada' | 'verificada' | 'reabierta' | 'vencida';

export interface ActionCardProps {
  title: string;
  owner?: string;
  dueDate?: string;
  status: ActionStatus;
  daysLeft?: number;
  requiresVerification?: boolean;
  onPress?: () => void;
  footer?: ReactNode;
  id?: string;
  className?: string;
}

export class ActionModel {
  private static readonly LABELS: Record<ActionStatus, string> = {
    abierta: 'Abierta',
    reportada: 'Reportada',
    verificada: 'Verificada',
    reabierta: 'Reabierta',
    vencida: 'Vencida',
  };

  private static readonly TONES: Record<ActionStatus, Tone> = {
    abierta: 'info',
    reportada: 'primary',
    verificada: 'success',
    reabierta: 'warning',
    vencida: 'danger',
  };

  public static label(status: ActionStatus): string {
    return ActionModel.LABELS[status];
  }

  public static tone(status: ActionStatus): Tone {
    return ActionModel.TONES[status];
  }

  public static daysText(daysLeft: number): string {
    const days = Math.abs(Math.round(daysLeft));
    if (daysLeft < 0) {
      return `Vencida hace ${days} ${days === 1 ? 'día' : 'días'}`;
    }
    if (daysLeft === 0) {
      return 'Vence hoy';
    }
    return `Vence en ${days} ${days === 1 ? 'día' : 'días'}`;
  }

  public static daysTone(daysLeft: number): Tone {
    if (daysLeft < 0) {
      return 'danger';
    }
    return daysLeft <= 7 ? 'warning' : 'neutral';
  }
}

export function ActionCard({
  title,
  owner,
  dueDate,
  status,
  daysLeft,
  requiresVerification,
  onPress,
  footer,
  id,
  className,
}: ActionCardProps) {
  const details: RecordDetail[] = [];
  if (owner) {
    details.push({ icon: User, label: 'Responsable', text: owner });
  }
  if (dueDate) {
    details.push({ icon: CalendarBlank, label: 'Fecha límite', text: DateFormatter.date(dueDate) });
  }
  if (requiresVerification) {
    details.push({ icon: ShieldCheck, label: 'Verificación', text: 'Requiere verificación de eficacia por otra persona' });
  }
  const showDays = daysLeft !== undefined && status !== 'verificada';

  return (
    <RecordCard
      id={id}
      className={className}
      title={title}
      details={details}
      onPress={onPress}
      footer={footer}
      badges={
        <>
          <Badge label={ActionModel.label(status)} tone={ActionModel.tone(status)} />
          {showDays ? <Badge label={ActionModel.daysText(daysLeft)} tone={ActionModel.daysTone(daysLeft)} /> : null}
        </>
      }
    />
  );
}
