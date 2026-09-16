# Arquitectura del parser SDUI

Módulo: [`src/sdui/`](../src/sdui/)

Parser recursivo y agnóstico de framework para el contrato SDUI (Server-Driven UI) definido en `sdui_schema.json` (pantallas de auditoría interna ISO 9001 / ISO 19011). Recibe el JSON crudo que envía el servidor y produce un árbol de clases tipadas (`ScreenModel`), listo para que una capa de renderizado (React, u otra) lo recorra.

No depende de ningún framework — es TypeScript puro. La composición de dependencias entre parsers se hace manualmente (`new`), sin contenedor de inyección de dependencias; ver `parsing/parsers/screen/screen-parser.spec.ts` como ejemplo de "composition root".

## Principios seguidos

- **Recursivo de punta a punta**: el árbol de `Component` (`children`) y el árbol de `Condition` (`all`/`any`/`not`) se parsean y evalúan llamándose a sí mismos, no con colas/pilas manuales.
- **SOLID**: cada clase resuelve una única responsabilidad; los parsers dependen de abstracciones (`AbstractNodeParser<T>`) y reciben sus colaboradores por constructor; nuevas variantes (operador de condición, tipo de nodo) se agregan sin tocar código existente.
- **Una clase por archivo, sin funciones sueltas**: no hay funciones exportadas a nivel de módulo; todo comportamiento vive en métodos de clase.
- **Carpetas por responsabilidad**, y dentro de cada una, subcarpetas por familia de entidad cuando hay 2+ archivos relacionados (`screen/`, `component/`, `state/`, `action/`, `nodes/`). Un archivo sin familia se queda en la raíz de su carpeta.
- **Rutas absolutas**: ningún archivo del módulo usa imports relativos (`./` o `../`), ni siquiera entre archivos de la misma carpeta — todo pasa por alias de `tsconfig.app.json`.
- **Sin decoradores de constructor**: `erasableSyntaxOnly` (activo por defecto en el template Vite + TS) prohíbe *parameter properties* (`constructor(private readonly x: T)`) y decoradores de clase, porque Vite/esbuild solo hace *type-stripping*, no transformación de código. Todas las clases declaran sus campos explícitamente y los asignan en el cuerpo del constructor.

## Estructura de carpetas

```
sdui/
├── model/                        Clases de datos (value objects), resultado del parseo
│   ├── sdui-enums.ts              Enums del catálogo SDUI (tipos de componente, ops, roles...)
│   ├── action.model.ts
│   ├── rule.model.ts
│   ├── component/
│   │   ├── component.model.ts
│   │   └── component-events.model.ts
│   ├── screen/
│   │   ├── screen.model.ts
│   │   ├── screen-context.model.ts
│   │   ├── screen-user.model.ts
│   │   ├── screen-entity.model.ts
│   │   ├── screen-offline.model.ts
│   │   └── screen-meta.model.ts
│   └── state/
│       ├── state-machine.model.ts
│       └── state-transition.model.ts
│
├── condition/                     Árbol de condiciones evaluables (patrón Composite)
│   ├── condition-node.ts          Clase base abstracta: evaluate(context): boolean
│   ├── condition-operator-evaluator.ts
│   └── nodes/                     Subclases concretas de ConditionNode
│       ├── field-condition-node.ts
│       ├── all-condition-node.ts
│       ├── any-condition-node.ts
│       └── not-condition-node.ts
│
├── path/                          Resolución de rutas tipo "respuestas[q12].resultado"
│   ├── path-tokenizer.ts
│   └── path-resolver.ts
│
├── parsing/                       JSON crudo (unknown) -> model/ + condition/
│   ├── support/                   Infraestructura común a todos los parsers
│   │   ├── parse-error.ts
│   │   ├── parse-error-collector.ts
│   │   ├── parse-result.ts
│   │   └── input-guard.ts
│   └── parsers/
│       ├── abstract-node-parser.ts   Clase base (template method) de todo parser
│       ├── condition-parser.ts       Construye el árbol de condition/nodes
│       ├── component-parser.ts       Recursivo sobre sí mismo para children
│       ├── rule-parser.ts
│       ├── action/
│       │   ├── action-parser.ts
│       │   └── action-map-parser.ts
│       ├── state/
│       │   ├── state-transition-parser.ts
│       │   └── state-machine-parser.ts
│       └── screen/
│           ├── screen-context-parser.ts
│           ├── screen-parser.ts       Fachada pública: parseScreen(input)
│           └── screen-parser.spec.ts
│
├── traversal/                     Recorrido del árbol ya parseado
│   └── component-traverser.ts     walk / findById / collectBindPaths
│
└── index.ts                       Barrel: reexporta todo el módulo
```

## Flujo de datos

```
JSON del servidor (unknown)
        │
        ▼
  ScreenParser.parseScreen(input)
        │
        ├─ ScreenContextParser  → ScreenContextModel (user, entity, offline, data)
        ├─ ComponentParser      → ComponentModel (recursivo sobre children)
        │        └─ ConditionParser → ConditionNode (recursivo: all/any/not/field)
        ├─ ActionMapParser      → Record<string, ActionModel>
        ├─ RuleParser[]         → RuleModel[] (cada uno con su ConditionNode)
        └─ StateMachineParser   → StateMachineModel
        │
        ▼
  ParseResult<ScreenModel>   { ok: true, value }  |  { ok: false, errors: ParseError[] }
```

Si algo no matchea el contrato, no se lanza una excepción: se acumula un `ParseError` con la ruta exacta del fallo (ej. `$.root.children[0].type`) y el resultado final es `{ ok: false, errors }`.

## Piezas clave

### `AbstractNodeParser<TResult>`

Clase base abstracta (template method) que:
- valida que el `input` sea un objeto (`InputGuard.isRecord`) antes de delegar,
- expone `protected parseArray<TItem>(...)`, reutilizado por todos los parsers para listas (`children`, `rules`, `transitions`, `all`, `any`) — incluido el caso en que un parser se pasa **a sí mismo** (`this`) como `itemParser`, lo que produce la recursión.

Cada parser concreto solo implementa `describeExpectedShape()` y `parseRecord()`.

### `ConditionNode` (patrón Composite)

En vez de un `switch` sobre la forma del JSON, cada variante de condición (`field`, `all`, `any`, `not`) es una clase que extiende `ConditionNode` e implementa `evaluate(context)`. Evaluar una condición compuesta es simplemente invocar `evaluate` sobre sus hijos — polimorfismo en vez de ramas condicionales.

### `ScreenParser` como fachada

`ScreenParser` es el único punto de entrada pensado para consumo externo: recibe por constructor a `ScreenContextParser`, `ComponentParser`, `ActionMapParser`, `RuleParser` y `StateMachineParser`, y expone `parseScreen(input): ParseResult<ScreenModel>`. Como no hay contenedor de DI, quien use el módulo arma esas instancias a mano (ver `createScreenParser()` en el spec) o las memoiza (ej. en un `useMemo`/módulo singleton si se consume desde un componente React).

## Alias de imports (`tsconfig.app.json`)

Ningún archivo bajo `sdui/` usa rutas relativas. Cada carpeta (y subcarpeta con 2+ archivos relacionados) tiene su propio alias, resuelto en runtime por Vite vía `resolve.tsconfigPaths: true` (`vite.config.ts`) — no requiere ningún plugin adicional:

| Alias | Apunta a |
|---|---|
| `@sdui-model/*` | `model/` (raíz: enums, `action.model`, `rule.model`) |
| `@sdui-model-screen/*` | `model/screen/` |
| `@sdui-model-component/*` | `model/component/` |
| `@sdui-model-state/*` | `model/state/` |
| `@sdui-condition/*` | `condition/` (raíz: `condition-node`, `condition-operator-evaluator`) |
| `@sdui-condition-nodes/*` | `condition/nodes/` |
| `@sdui-path/*` | `path/` |
| `@sdui-parsing-support/*` | `parsing/support/` |
| `@sdui-parsers/*` | `parsing/parsers/` (raíz: `abstract-node-parser`, `component-parser`, `condition-parser`, `rule-parser`) |
| `@sdui-parsers-screen/*` | `parsing/parsers/screen/` |
| `@sdui-parsers-state/*` | `parsing/parsers/state/` |
| `@sdui-parsers-action/*` | `parsing/parsers/action/` |
| `@sdui-traversal/*` | `traversal/` |

Un archivo va en la raíz de su carpeta (sin alias propio de subcarpeta) cuando no comparte prefijo/familia con ningún otro archivo de esa carpeta.

## Cómo extender

- **Nuevo tipo de componente**: agregar el literal a `COMPONENT_TYPES` en `model/sdui-enums.ts`. No requiere tocar `ComponentParser`.
- **Nuevo operador de condición**: agregar el literal a `CONDITION_OPS` y el caso en `ConditionOperatorEvaluator.apply()`.
- **Nueva forma de condición** (además de `field`/`all`/`any`/`not`): crear una clase en `condition/nodes/` que extienda `ConditionNode`, y agregar la rama correspondiente en `ConditionParser.parseRecord()`.
- **Nueva sección del contrato Screen** (ej. algo nuevo en el JSON): crear su `*.model.ts` en la subcarpeta de `model/` que corresponda, su `*-parser.ts` en `parsing/parsers/` extendiendo `AbstractNodeParser`, pasarlo por constructor a `ScreenParser`, y agregar el alias en `tsconfig.app.json` si la subcarpeta tiene 2+ archivos.
- **Nuevas clases con dependencias**: usar siempre `private readonly campo: Tipo;` + asignación en el cuerpo del constructor — nunca *parameter properties* (`constructor(private readonly x: T)`), porque `erasableSyntaxOnly` las rechaza.

## Pendiente (fuera de este módulo)

Este parser no renderiza nada — solo produce el `ScreenModel` tipado. La capa de renderizado (mapear cada `ComponentType` a un componente React real) y la ejecución de `Action` (llamadas HTTP, navegación, `optimistic`/offline) quedan como una capa aparte a construir sobre este módulo.
