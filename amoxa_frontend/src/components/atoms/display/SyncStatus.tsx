import { CheckCircle, WarningCircle, WifiSlash, ArrowsClockwise, type Icon } from '@phosphor-icons/react';
import { DateFormatter } from '@utils-format/DateFormatter.js';
import { ToneStyles, type Tone } from '@utils-style/ToneStyles.js';
import { ClassNames } from '@utils-style/cn.js';

export type SyncState = 'synced' | 'pending' | 'offline' | 'error';

export interface SyncStatusProps {
  state: SyncState;
  pending?: number;
  lastSyncAt?: string;
  id?: string;
  className?: string;
}

export class SyncStatusModel {
  private static readonly ICONS: Record<SyncState, Icon> = {
    synced: CheckCircle,
    pending: ArrowsClockwise,
    offline: WifiSlash,
    error: WarningCircle,
  };

  private static readonly TONES: Record<SyncState, Tone> = {
    synced: 'success',
    pending: 'info',
    offline: 'warning',
    error: 'danger',
  };

  public static icon(state: SyncState): Icon {
    return SyncStatusModel.ICONS[state];
  }

  public static tone(state: SyncState): Tone {
    return SyncStatusModel.TONES[state];
  }

  public static text(state: SyncState, pending?: number): string {
    const count = pending ?? 0;
    switch (state) {
      case 'synced':
        return 'Sincronizado';
      case 'pending':
        return count > 0 ? `${count} ${count === 1 ? 'cambio pendiente' : 'cambios pendientes'}` : 'Sincronizando';
      case 'offline':
        return count > 0
          ? `Sin conexión · ${count} ${count === 1 ? 'cambio guardado' : 'cambios guardados'} en el dispositivo`
          : 'Sin conexión';
      case 'error':
        return 'Error de sincronización';
    }
  }
}

export function SyncStatus({ state, pending, lastSyncAt, id, className }: SyncStatusProps) {
  const StateIcon = SyncStatusModel.icon(state);
  const tone = SyncStatusModel.tone(state);

  return (
    <div
      id={id}
      role="status"
      aria-live="polite"
      className={ClassNames.merge(
        'inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg px-3 py-2 text-sm',
        ToneStyles.soft(tone),
        className,
      )}
    >
      <StateIcon size={18} weight="fill" aria-hidden="true" className="shrink-0" />
      <span className="min-w-0 font-semibold">{SyncStatusModel.text(state, pending)}</span>
      {lastSyncAt ? (
        <span className="min-w-0 text-xs tabular-nums">Última sincronización: {DateFormatter.dateTime(lastSyncAt)}</span>
      ) : null}
    </div>
  );
}
