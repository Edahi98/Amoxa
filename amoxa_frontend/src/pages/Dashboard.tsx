export function Dashboard() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
      <div>
        <p className="text-sm font-medium text-primary">Panel</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">El panel se renderiza desde el servidor</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          Esta pantalla se construirá a partir del JSON de pantalla (SDUI) que devuelve el backend. Ver
          TODO.md para el plan de implementación.
        </p>
      </div>
    </div>
  );
}
