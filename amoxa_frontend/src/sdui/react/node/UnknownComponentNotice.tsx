export interface UnknownComponentNoticeProps {
  type: string;
  id: string;
}

export function UnknownComponentNotice({ type, id }: UnknownComponentNoticeProps) {
  return (
    <div
      role="note"
      aria-label={`Bloque no disponible: ${type}`}
      className="rounded-lg border border-dashed border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
    >
      Este bloque no se puede mostrar en esta versión de la aplicación.
      <span className="sr-only"> Tipo {type}, identificador {id}.</span>
    </div>
  );
}
