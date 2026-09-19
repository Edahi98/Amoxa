import { useId, useState, type ChangeEvent, type DragEvent } from 'react';
import { Paperclip, X } from '@phosphor-icons/react';
import { Button } from '@atoms-button/Button.js';
import { ByteFormatter } from '@utils-format/ByteFormatter.js';
import { FileEncoder, type EncodedFile } from '@utils-file/FileEncoder.js';
import { ClassNames } from '@utils-style/cn.js';

export type { EncodedFile } from '@utils-file/FileEncoder.js';

export interface FileInputProps {
  label: string;
  accept?: string;
  maxBytes?: number;
  hint?: string;
  value: EncodedFile | null;
  onValueChange: (value: EncodedFile | null) => void;
  error?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function FileInput({
  label,
  accept = '',
  maxBytes = FileEncoder.DEFAULT_MAX_BYTES,
  hint,
  value,
  onValueChange,
  error,
  disabled,
  id,
  className,
}: FileInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-mensaje`;
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const shownError = localError ?? error;

  const [dropping, setDropping] = useState(false);

  const acceptFile = async (file: File) => {
    const violation = FileEncoder.violation(file, accept, maxBytes);
    if (violation !== undefined) {
      setLocalError(violation);
      return;
    }
    setLocalError(null);
    setBusy(true);
    try {
      onValueChange(await FileEncoder.encode(file));
    } catch {
      setLocalError('No se pudo leer el archivo. Inténtelo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await acceptFile(file);
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDropping(false);
    const file = event.dataTransfer.files?.[0];
    if (file && !disabled && !busy) await acceptFile(file);
  };

  const clear = () => {
    setLocalError(null);
    onValueChange(null);
  };

  return (
    <div className={ClassNames.merge('flex min-w-0 flex-col gap-2', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={inputId}
        type="file"
        accept={accept === '' ? undefined : accept}
        disabled={disabled || busy}
        aria-invalid={shownError ? true : undefined}
        aria-describedby={shownError || hint ? messageId : undefined}
        onChange={handleChange}
        className="sr-only"
      />
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !busy) setDropping(true);
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={handleDrop}
        className={ClassNames.merge(
          'flex min-w-0 flex-wrap items-center gap-3 rounded-lg border border-dashed border-border p-3 transition-colors duration-200',
          dropping && 'border-primary bg-primary-muted',
        )}
      >
        <label
          htmlFor={inputId}
          className={ClassNames.merge(
            'inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-muted has-[:focus-visible]:outline-2',
            (disabled || busy) && 'pointer-events-none opacity-50',
          )}
        >
          <Paperclip size={18} aria-hidden="true" />
          {busy ? 'Leyendo…' : value ? 'Cambiar archivo' : 'Elegir archivo'}
        </label>
        {value ? (
          <>
            <span className="min-w-0 break-words text-sm text-foreground">
              {value.nombre} · <span className="tabular-nums text-muted-foreground">{ByteFormatter.format(value.tamano)}</span>
            </span>
            <Button variant="ghost" onClick={clear} disabled={disabled} icon={X} aria-label={`Quitar ${value.nombre}`} />
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Ningún archivo elegido. También puede arrastrarlo aquí.</span>
        )}
      </div>
      {shownError ? (
        <p id={messageId} role="alert" className="text-sm text-destructive">
          {shownError}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
