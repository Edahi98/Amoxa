import { useId, useState, type ChangeEvent } from 'react';
import { CircleNotch, FileText, MapPin, Paperclip } from '@phosphor-icons/react';
import { Badge } from '@atoms-display/Badge.js';
import { Banner } from '@molecules-feedback/Banner.js';
import { DateFormatter } from '@utils-format/DateFormatter.js';
import { ByteFormatter } from '@utils-format/ByteFormatter.js';
import { NumberFormatter } from '@utils-format/NumberFormatter.js';
import type { EvidenceItem } from '@utils-evidence/EvidenceItem.js';
import { EvidenceStamper } from '@utils-evidence/EvidenceStamper.js';
import { GeoLocator } from '@utils-evidence/GeoLocator.js';
import { Sha256Hasher } from '@utils-evidence/Sha256Hasher.js';
import { ClassNames } from '@utils-style/cn.js';

export type { EvidenceItem } from '@utils-evidence/EvidenceItem.js';

export interface EvidenceCaptureProps {
  label?: string;
  accept?: string;
  requireGeo?: boolean;
  value: EvidenceItem[];
  onValueChange: (value: EvidenceItem[]) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function EvidenceCapture({
  label = 'Evidencia',
  accept = 'image/*,application/pdf',
  requireGeo = false,
  value,
  onValueChange,
  disabled,
  id,
  className,
}: EvidenceCaptureProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) {
      return;
    }
    setBusy(true);
    setNotice(null);
    const added: EvidenceItem[] = [];
    const failures: string[] = [];
    for (const file of files) {
      const result = await EvidenceStamper.stamp(file, requireGeo);
      if (result.ok) {
        added.push(result.item);
      } else {
        failures.push(`${file.name}: ${GeoLocator.describe(result.reason)}`);
      }
    }
    if (added.length > 0) {
      onValueChange([...value, ...added]);
    }
    setNotice(failures.length > 0 ? failures.join(' ') : null);
    setBusy(false);
  };

  const toggleVerified = (itemId: string) => {
    onValueChange(value.map((item) => (item.id === itemId ? { ...item, verified: !item.verified } : item)));
  };

  return (
    <div className={ClassNames.merge('flex min-w-0 flex-col gap-3', className)}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <div>
          <input
            id={inputId}
            type="file"
            accept={accept}
            multiple
            disabled={disabled || busy}
            onChange={handleFiles}
            className="peer sr-only"
          />
          <label
            htmlFor={inputId}
            className={ClassNames.merge(
              'inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
              disabled || busy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-muted',
            )}
          >
            {busy ? (
              <CircleNotch size={18} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Paperclip size={18} aria-hidden="true" />
            )}
            {busy ? 'Sellando archivos…' : 'Adjuntar evidencia'}
          </label>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {requireGeo
          ? 'Cada archivo se sella con fecha, ubicación obligatoria y huella SHA-256. No se puede editar ni eliminar.'
          : 'Cada archivo se sella con fecha, ubicación y huella SHA-256. No se puede editar ni eliminar.'}
      </p>
      {notice ? <Banner tone="warning" title="No se adjuntaron todos los archivos" message={notice} /> : null}
      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-input px-4 py-6 text-center text-sm text-muted-foreground">
          Aún no hay evidencia adjunta.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Archivos de evidencia">
          {value.map((item) => (
            <li key={item.id} className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-3">
              <div className="flex min-w-0 items-start gap-2">
                <FileText size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="min-w-0 break-words text-sm font-semibold text-foreground">{item.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {ByteFormatter.format(item.size)} · {DateFormatter.dateTime(item.capturedAt)}
                  </span>
                </div>
                {item.verified ? <Badge label="Verificada" tone="success" /> : null}
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {item.latitude !== undefined && item.longitude !== undefined ? (
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <MapPin size={14} aria-hidden="true" />
                    <span className="sr-only">Ubicación: </span>
                    {NumberFormatter.coordinate(item.latitude)}, {NumberFormatter.coordinate(item.longitude)}
                  </span>
                ) : (
                  <span>Sin ubicación registrada</span>
                )}
                {item.sha256 ? (
                  <span className="min-w-0 break-all tabular-nums" title={item.sha256}>
                    SHA-256: {Sha256Hasher.shorten(item.sha256)}
                  </span>
                ) : null}
              </div>
              <label className="flex min-h-11 w-fit cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={Boolean(item.verified)}
                  disabled={disabled}
                  onChange={() => toggleVerified(item.id)}
                  className="h-5 w-5 cursor-pointer accent-primary"
                />
                Marcar como verificada
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
