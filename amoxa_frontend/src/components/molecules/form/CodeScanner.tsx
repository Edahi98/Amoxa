import { useEffect, useRef, useState } from 'react';
import { Barcode, X } from '@phosphor-icons/react';
import { Button } from '@atoms-button/Button.js';
import { Input } from '@atoms-form/Input.js';
import { CodeReader } from '@utils-scan/CodeReader.js';
import { ClassNames } from '@utils-style/cn.js';

export interface CodeScannerProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  hint?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function CodeScanner({ label, value, onValueChange, hint, error, disabled, id, className }: CodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canScan = CodeReader.supported();
  const latest = useRef(onValueChange);
  latest.current = onValueChange;

  useEffect(() => {
    if (!scanning) return undefined;
    let active = true;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const stop = () => {
      active = false;
      if (timer !== undefined) clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };

    const start = async () => {
      try {
        const detector = await CodeReader.detector();
        if (detector === undefined) throw new Error('unsupported');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (video === null) return;
        video.srcObject = stream;
        await video.play();
        const tick = async () => {
          if (!active) return;
          try {
            const found = await detector.detect(video);
            const code = found.length > 0 ? CodeReader.sanitize(found[0].rawValue) : '';
            if (code !== '') {
              latest.current(code);
              setProblem(null);
              setScanning(false);
              return;
            }
          } catch {
            timer = undefined;
          }
          timer = setTimeout(() => void tick(), 250);
        };
        void tick();
      } catch {
        if (active) {
          setProblem('No se pudo usar la cámara. Revise el permiso del navegador o escriba el código a mano.');
          setScanning(false);
        }
      }
    };

    void start();
    return stop;
  }, [scanning]);

  const shownError = problem ?? error;

  return (
    <div className={ClassNames.merge('flex min-w-0 flex-col gap-3', className)}>
      <Input
        id={id}
        label={label}
        value={value}
        maxLength={CodeReader.MAX_LENGTH}
        disabled={disabled}
        hint={hint}
        error={shownError}
        autoComplete="off"
        onChange={(event) => onValueChange(CodeReader.sanitize(event.target.value))}
        trailing={
          canScan && !scanning ? (
            <Button variant="ghost" icon={Barcode} onClick={() => setScanning(true)} disabled={disabled} aria-label="Escanear código con la cámara" />
          ) : undefined
        }
      />
      {scanning ? (
        <div className="flex flex-col gap-2">
          <video ref={videoRef} muted playsInline className="aspect-video w-full max-w-md rounded-lg border border-border bg-muted object-cover" aria-label="Vista de la cámara" />
          <p role="status" className="text-sm text-muted-foreground">
            Apunte al código QR o de barras. Se lee solo.
          </p>
          <div>
            <Button variant="outline" icon={X} onClick={() => setScanning(false)}>
              Cancelar escaneo
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
