# TODO — Frontend

Lo que quedó fuera de esta pasada (solo se construyó `Home`). Ver [PRODUCT.md](PRODUCT.md) y
[DESIGN.md](DESIGN.md) para el contexto de producto/diseño antes de retomar cualquiera de estos puntos.

## Dashboard (renderizado SDUI)

`src/pages/Dashboard.tsx` es un placeholder. El plan real:

1. **Motor de renderizado**: un `ComponentRenderer` que recorre `ScreenModel.root` (usando
   `ComponentTraverser` de `src/sdui/traversal/`) y mapea cada `ComponentType` del catálogo SDUI
   (`src/sdui/model/sdui-enums.ts`) a un átomo/molécula real de `src/components/`.
2. **Templates por familia de pantalla**: cada `screen_id` (ej. `programa.lista`, `auditoria.checklist`,
   `hallazgo.editar`, `informe.distribuir`, `accion.verificar`) mapea a un `template` de
   `src/components/templates/` — así la estructura de carpetas por responsabilidad del parser
   (`src/sdui/parsing/parsers/screen/`, `.../state/`, `.../action/`) tiene su equivalente visual.
3. **Condiciones y binding**: usar `ConditionNode.evaluate(context)` para `visible_if`/`enabled_if`, y
   `PathResolver` para leer/escribir `bind` contra `context.data`.
4. **Acciones**: ejecutar `Action` (`navigate`, `submit`, `refresh`, `open_modal`, `call_api`, `confirm`,
   `toast`, `sync_now`, `capture_media`, `logout`) contra el backend, respetando `idempotency_key`,
   `if_version` (concurrencia optimista) y `requires_rules`.
5. **Reglas locales**: mostrar `severity: block/warn/info` de `Rule` antes de permitir un `submit`
   (validación offline, nunca sustituye al backend).
6. **Máquina de estados**: usar `state_machine` de la pantalla para ocultar/deshabilitar acciones no
   permitidas por rol/transición actual.

## Autenticación en el frontend

- `AuthContext` en `src/contexts/` (usuario actual, token, `login`/`logout`), consumiendo
  `POST /auth/login` y `POST /auth/register` del backend.
- Guardar el JWT (30 min de vida) y renovar la sesión o redirigir a login al expirar / recibir 401.
- `ProtectedRoute` (o loader de `react-router-dom`) que proteja `/dashboard`.
- Páginas/formularios de login y registro reales (hoy `Home` solo enlaza directo a `/dashboard` sin
  pasar por auth).
- El registro público (`/auth/register`) hoy exige conocer un `organizacionId` existente — no hay flujo
  de alta de organización nueva. Definir con el backend cómo entra una organización nueva al sistema
  antes de construir el formulario de registro.

## Componentes por construir (cuando el Dashboard los necesite)

Átomos: `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Toggle`, `DateInput`, `Avatar`,
`Spinner`, `Toast`.
Moléculas/organismos del shell autenticado: `Sidebar`, `TopBar` (menú de usuario), `EmptyState`, banner de
`sync_status` (offline), `Modal`.

## Offline-first (checklist móvil)

El README exige que el recorrido de auditoría funcione sin conexión, con evidencia georreferenciada. No
hay nada implementado todavía: cola local (IndexedDB), estrategia de sync/conflicto
(`last_write_wins` / `server_wins` / `manual`, ver `ScreenOfflineModel`), y probablemente un Service
Worker/PWA. Diseñar aparte, no como afterthought del renderer SDUI.

## Cliente API

No existe todavía una capa tipada para llamar al backend (`amoxa_backend`). Falta un cliente
(`fetch`/hook) que agregue el header `Authorization`, maneje 401 y sirva de base a las `call_api` del
motor SDUI.

## Calidad / pulido

- Validado visualmente en desktop (1440) y mobile (375), claro y oscuro. Falta 768/1024 y Safari/iOS real
  (solo se probó en el navegador embebido de la sesión).
- Sin tests de componentes UI todavía (solo existen los del parser SDUI). Agregar Vitest + Testing
  Library para `Button`, `LinkButton`, `ThemeToggle`/`ThemeContext`, y los organismos de `Home`.
- Sin auditoría de accesibilidad automatizada (axe-core u otra) corrida sobre `Home`.
- Favicon sigue siendo el default de Vite (`public/favicon.svg`) — reemplazar por una marca real de
  Amoxa.
- Sin metadatos de SEO/redes (Open Graph, Twitter Card) ni `robots.txt`/`sitemap.xml`.
- El sistema de diseño solo tiene `DESIGN.md` (frontmatter + prosa); no se generó el sidecar
  `.impeccable/design.json` (rampas tonales, tokens de movimiento) — opcional, solo si `impeccable` lo
  vuelve a necesitar.
- No se corrió el pipeline completo de `impeccable` (generación de comps, `impeccable-finish-reviewer`,
  `comp-diff`) — se construyó directo en código por pedido explícito de mantener el alcance en solo
  `Home`. Si se quiere una pasada de pulido más profunda: `/impeccable polish` o `/impeccable critique`
  sobre `Home`.
