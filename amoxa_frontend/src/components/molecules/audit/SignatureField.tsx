import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Eraser, PenNib } from '@phosphor-icons/react';
import { Input } from '@atoms-form/Input.js';
import { Button } from '@atoms-button/Button.js';
import { DateFormatter } from '@utils-format/DateFormatter.js';
import { SignatureRenderer } from '@utils-evidence/SignatureRenderer.js';
import { ClassNames } from '@utils-style/cn.js';

export interface SignatureValue {
  dataUrl: string;
  signedAt: string;
}

export interface SignatureFieldProps {
  label: string;
  signerName?: string;
  value: SignatureValue | null;
  onValueChange: (value: SignatureValue | null) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function SignatureField({ label, signerName, value, onValueChange, disabled, id, className }: SignatureFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [typedName, setTypedName] = useState(signerName ?? '');
  const hasValue = value !== null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    const context = canvas.getContext('2d');
    if (context) {
      context.scale(ratio, ratio);
      context.lineWidth = 2.5;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = getComputedStyle(canvas).color;
    }
    dirty.current = false;
  }, [hasValue]);

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handleDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (disabled) {
      return;
    }
    const context = event.currentTarget.getContext('2d');
    if (!context) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const { x, y } = point(event);
    context.beginPath();
    context.moveTo(x, y);
    drawing.current = true;
  };

  const handleMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) {
      return;
    }
    const context = event.currentTarget.getContext('2d');
    if (!context) {
      return;
    }
    const { x, y } = point(event);
    context.lineTo(x, y);
    context.stroke();
    dirty.current = true;
  };

  const handleUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) {
      return;
    }
    drawing.current = false;
    if (dirty.current) {
      onValueChange({ dataUrl: event.currentTarget.toDataURL('image/png'), signedAt: new Date().toISOString() });
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) {
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.restore();
    }
    dirty.current = false;
    onValueChange(null);
  };

  const signWithName = () => {
    const ink = canvasRef.current ? getComputedStyle(canvasRef.current).color : 'black';
    const dataUrl = SignatureRenderer.fromText(typedName, ink);
    if (dataUrl) {
      onValueChange({ dataUrl, signedAt: new Date().toISOString() });
    }
  };

  return (
    <div id={id} className={ClassNames.merge('flex min-w-0 flex-col gap-3', className)}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Button variant="outline" disabled={disabled || (!hasValue && !dirty.current)} onClick={clear}>
          <Eraser size={18} aria-hidden="true" />
          Borrar
        </Button>
      </div>
      {value ? (
        <div className="flex min-w-0 flex-col gap-2">
          <img
            src={value.dataUrl}
            alt={signerName ? `Firma de ${signerName}` : 'Firma capturada'}
            className="h-40 w-full rounded-lg border border-input bg-white object-contain"
          />
          <p className="text-xs text-muted-foreground tabular-nums">Firmado el {DateFormatter.dateTime(value.signedAt)}</p>
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            aria-label="Área de firma. Si no puedes dibujar, escribe tu nombre en el campo de abajo."
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
            onPointerCancel={handleUp}
            className="h-40 w-full touch-none rounded-lg border border-dashed border-input bg-white text-slate-900"
          />
          <div className="flex min-w-0 flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1">
              <Input
                label="Escribir nombre para firmar"
                value={typedName}
                disabled={disabled}
                autoComplete="name"
                onChange={(event) => setTypedName(event.target.value)}
              />
            </div>
            <Button variant="secondary" disabled={disabled || typedName.trim().length === 0} onClick={signWithName}>
              <PenNib size={18} aria-hidden="true" />
              Firmar con nombre
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
