import { useState } from 'react';
import { CircleNotch, MapPin } from '@phosphor-icons/react';
import { Button } from '@atoms-button/Button.js';
import { DateFormatter } from '@utils-format/DateFormatter.js';
import { NumberFormatter } from '@utils-format/NumberFormatter.js';
import { GeoLocator, type GeoReading } from '@utils-evidence/GeoLocator.js';
import { ClassNames } from '@utils-style/cn.js';

export type GeoStampValue = GeoReading;

export interface GeoStampProps {
  label?: string;
  value: GeoStampValue | null;
  onValueChange: (value: GeoStampValue | null) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function GeoStamp({ label = 'Ubicación', value, onValueChange, disabled, id, className }: GeoStampProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = async () => {
    setBusy(true);
    setError(null);
    const result = await GeoLocator.current();
    if (result.ok) {
      onValueChange(result.reading);
    } else {
      setError(GeoLocator.describe(result.reason));
    }
    setBusy(false);
  };

  return (
    <div id={id} className={ClassNames.merge('flex min-w-0 flex-col gap-3', className)}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Button variant="outline" disabled={disabled || busy} onClick={capture}>
          {busy ? (
            <CircleNotch size={18} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          ) : (
            <MapPin size={18} aria-hidden="true" />
          )}
          {busy ? 'Obteniendo ubicación…' : value ? 'Capturar de nuevo' : 'Capturar ubicación'}
        </Button>
      </div>
      {value ? (
        <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-1 rounded-lg border border-border bg-card p-3 text-sm sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Latitud</dt>
            <dd className="m-0 font-medium text-foreground tabular-nums">{NumberFormatter.coordinate(value.latitude)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Longitud</dt>
            <dd className="m-0 font-medium text-foreground tabular-nums">{NumberFormatter.coordinate(value.longitude)}</dd>
          </div>
          {value.accuracy !== undefined ? (
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Precisión</dt>
              <dd className="m-0 font-medium text-foreground tabular-nums">± {NumberFormatter.format(value.accuracy, 'm')}</dd>
            </div>
          ) : null}
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Capturada</dt>
            <dd className="m-0 font-medium text-foreground tabular-nums">{DateFormatter.dateTime(value.capturedAt)}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">Sin ubicación capturada.</p>
      )}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
