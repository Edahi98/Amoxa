export function ScreenSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex min-w-0 flex-col gap-6">
      <span className="sr-only">Cargando pantalla…</span>
      <div aria-hidden="true" className="flex flex-col gap-3">
        <div className="h-8 w-2/3 max-w-sm rounded-lg bg-muted motion-safe:animate-pulse" />
        <div className="h-4 w-1/2 max-w-xs rounded-lg bg-muted motion-safe:animate-pulse" />
      </div>
      <div aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="h-24 rounded-xl bg-muted motion-safe:animate-pulse" />
        <div className="h-24 rounded-xl bg-muted motion-safe:animate-pulse" />
        <div className="h-24 rounded-xl bg-muted motion-safe:animate-pulse" />
      </div>
      <div aria-hidden="true" className="h-48 rounded-xl bg-muted motion-safe:animate-pulse" />
    </div>
  );
}
