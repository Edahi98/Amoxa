# TODO — Frontend

Ver [PRODUCT.md](PRODUCT.md) y [DESIGN.md](DESIGN.md) para el contexto de producto/diseño antes de retomar
cualquiera de estos puntos.

## Dashboard (renderizado SDUI)

Implementado:

- Contrato: `chart` en `COMPONENT_TYPES` y `lider` en `USER_ROLES` (`src/sdui/model/sdui-enums.ts`).
- Escritura de datos: `PathWriter` (`src/sdui/path/`), inmutable, con la misma notación que `PathTokenizer`.
- Parser listo para usar: `ScreenParserFactory` (`src/sdui/parsing/`), `ScreenApi` + `ScreenLoadError`
  (`src/sdui/api/`), `ApiClient` + `ApiError` + `SessionExpiredBus` (`src/utils/api/`).
- Reglas y máquina de estados: `RuleEvaluator` y `StateMachineGuard` (`src/sdui/rules/`).
- Acciones: `ActionExecutor` con `ActionEnvironment` (`src/sdui/actions/`). Cubre todas las `ACTION_TYPES`,
  `requires_rules`, máquina de estados, `idempotency_key`, `if_version`, `on_success`/`on_error`,
  `confirm_text` y placeholders `{entity.id}` / `{user.id}` / `{data.x}` en endpoints, payload y mensajes.
- Registro de componentes: `ComponentRegistry` con descriptor para los 35 tipos del contrato
  (`src/sdui/registry/`), más adaptadores de props/datos (`registry/adapters/`) y mappers por familia
  (`registry/mappers/`).
- Runtime React: `ScreenRuntimeProvider` (`src/contexts/`), `useScreenRuntime`, `useScreen`,
  `useScreenHost` (`src/hooks/screen/`), `NodeRenderer`, `ScreenRenderer`, `ScreenView`, `ModalScreen`,
  skeleton, estado de error con reintentar y estado vacío (`src/sdui/react/`).
- Universales nuevos: `Dialog` (sobre `<dialog>` nativo) y `ToastRegion` (`molecules/feedback`).
- Shell autenticado: `AppTemplate` (skip-link, marca, correo, tema, `SyncStatus`, cerrar sesión, `<main>`
  con foco en cada cambio de ruta), página `Screen` en `/app/:screenId`, `Dashboard` renderiza `inicio`.
- Reglas locales visibles: banners `block`/`warn`/`info` con resumen enfocable y enlaces a los campos;
  errores de campo desde `validations` y `required` (se revelan al tocar el campo o al bloquearse una acción).
- Un 401 en cualquier llamada hecha con `ApiClient` cierra sesión y redirige a `/login`.
- Templates por familia de pantalla: `ScreenFamilyRegistry` (`src/sdui/families/`) asigna cada `screen_id` a una
  de las 10 familias del mapa de navegación y `ScreenTemplateRegistry` (`src/sdui/react/template/`) a su
  template en `src/components/templates/screen/` (Home, Programa, Plantilla, Competencia, Seguimiento,
  Registro, Planificacion, Ejecucion, Informe, Accion). Cada uno compone `FamilyHeader` + `StageStepper` con su
  propio ancho y superficie (ejecución con etapas fijas, informe como documento). Una pantalla desconocida
  cae en el template de inicio.

Pendiente:

- Las etapas de cada familia son informativas y están definidas en el cliente (`ScreenFamilyRegistry`); no
  se filtran por rol ni las envía el servidor. Seguimiento y Registro no muestran etapas.
- Eventos `submit` y `long_press` del contrato: los componentes universales no los exponen y no están
  cableados (solo `press` y `change`).
- La forma de los datos enlazados con `bind` (chart, calendario, gantt, tarjetas, lista, `sync_status`) es
  una convención tolerante del cliente; el servidor todavía no envía `context.data` para esos componentes.
  Falta acordarla con el backend.
- `capture_media` solo enfoca el control `evidence_capture` de la pantalla; no abre la cámara por sí mismo.
- `tabs`: el estado de la pestaña activa no se guarda en `context.data`.
- Sin `Sidebar` ni menú de usuario; la navegación entre pantallas depende de lo que la pantalla `inicio` y
  cada pantalla declaren.

## Autenticación en el frontend

Ya implementado: `AuthContext`/`useAuth` (`src/contexts/`, `src/hooks/`), página `/login`
(`src/pages/Login.tsx` + `LoginForm`), `ProtectedRoute` protegiendo `/dashboard` y `/app/:screenId`, token
guardado en `localStorage` con expiración leída del propio JWT, y CORS habilitado en el backend
(`CORS_ORIGIN` en `.env`). Probado end-to-end contra el backend real: login válido, credenciales
inválidas, logout, y redirect automático a `/login` al entrar a `/dashboard` sin sesión. Un 401 de
cualquier llamada SDUI (`ApiClient`) ejecuta logout y limpia la caché de pantallas.

Pendiente:
- Renovar la sesión antes de que expire (hoy solo se detecta la expiración y se cierra sesión; no hay
  refresh token ni backend que lo soporte todavía).
- Página/formulario de registro real. El registro público (`POST /auth/register`) hoy exige conocer un
  `organizacionId` existente — no hay flujo de alta de organización nueva. Definir con el backend cómo
  entra una organización nueva al sistema antes de construir el formulario.
- Mensaje de error de login siempre es genérico ("Credenciales inválidas"), a propósito (no revela si
  el email existe) — respetarlo si se agrega más UX alrededor del formulario.
- **"¿Olvidaste tu contraseña?" — falta por completo, marcado P0 en crítica de `/impeccable critique`
  sobre `/login`.** Es el escape real que necesita un usuario con credenciales incorrectas (más frecuente
  que "regresar a Home"); hoy no hay forma de recuperar acceso. Requiere decidir infraestructura de envío
  de correo (proveedor SMTP, expiración de token, página de reseteo) antes de construir el endpoint en
  `amoxa_backend` y el formulario en frontend — no implementado a propósito hasta tener esa decisión.

## Componentes por construir

Ya existen los átomos y moléculas universales de `src/components` (formularios, layout, datos, auditoría,
calendario/gantt, `Banner`, `EmptyState`, `Dialog`, `ToastRegion`, `SyncStatus`).

Pendiente: `Avatar`, `Spinner`, `Sidebar`, `TopBar` con menú de usuario.

## Offline-first (checklist móvil)

Implementado (`src/sdui/offline/`):

- `OfflineQueue`: cola persistida en `localStorage` (con `try/catch`; si falla, sigue en memoria).
- `SyncManager`: vacía la cola al evento `online`, en `sync_now` y al montar el shell autenticado; política
  de conflicto ante HTTP 409 según `context.offline.conflict_policy` (`server_wins` descarta,
  `last_write_wins` reintenta sin `If-Version`, `manual` deja el elemento en conflicto). Expone el estado
  (`synced` / `pending` / `offline` / `error`), pendientes y última sincronización al `SyncStatus`.
- `submit`/`call_api` no GET sin conexión, en pantallas con `offline.enabled`, se encolan y el toast y el
  `SyncStatus` lo informan.
- `ScreenCache`: la pantalla se guarda según `cache_ttl_seconds` y se usa cuando falla la red.

Pendiente:

- Persistencia en IndexedDB, Service Worker y PWA: hoy todo vive en `localStorage` (cuota limitada).
- La evidencia (archivos binarios) no se encola: la cola guarda peticiones JSON, no blobs.
- No hay interfaz para resolver elementos en `conflict` o `failed` (`SyncManager.retry` / `discard` existen
  pero ninguna pantalla los usa).
- La cola no se separa por usuario ni se limpia al cerrar sesión.

## Cliente API

`ApiClient` (`src/utils/api/`) agrega `Authorization: Bearer`, serializa JSON, traduce errores a `ApiError`
y notifica los 401. `AuthApi` sigue independiente para `POST /auth/login`.

## Calidad / pulido

- Validado visualmente en desktop (1440) y mobile (375), claro y oscuro, solo `Home`. El shell autenticado y
  el renderer SDUI no se han visto en navegador; falta 375→1440, 768/1024 y Safari/iOS real.
- Las pruebas cubren lógica y render SSR (vitest, entorno node). Sin pruebas de interacción en DOM
  (Testing Library) para `Dialog`, `ToastRegion`, foco del resumen de validación, `AppTemplate`, `LoginForm`,
  `AuthContext`/`ProtectedRoute` ni los organismos de `Home`.
- Sin auditoría de accesibilidad automatizada (axe-core u otra).
- Favicon sigue siendo el default de Vite (`public/favicon.svg`) — reemplazar por una marca real de
  Amoxa.
- Sin metadatos de SEO/redes (Open Graph, Twitter Card) ni `robots.txt`/`sitemap.xml`.
- El sistema de diseño solo tiene `DESIGN.md` (frontmatter + prosa); no se generó el sidecar
  `.impeccable/design.json` (rampas tonales, tokens de movimiento) — opcional, solo si `impeccable` lo
  vuelve a necesitar.
- No se corrió el pipeline completo de `impeccable` (generación de comps, `impeccable-finish-reviewer`,
  `comp-diff`) sobre `AppTemplate` ni sobre el renderer SDUI.
