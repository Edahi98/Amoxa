# App Shell Page Overrides

> **PROJECT:** Amoxa
> **Page Type:** Application shell (navegación + área de contenido)
> Estas reglas reemplazan a las de `MASTER.md` para la estructura de la aplicación autenticada.

## Fuente de las reglas

Reglas de la tabla Quick Reference de ui-ux-pro-max (SKILL.md): `adaptive-navigation`, `nav-hierarchy`, `nav-label-icon`, `nav-state-active`, `persistent-nav`, `navigation-consistency`, `drawer-usage`, `destructive-nav-separation`, `state-preservation`, `focus-on-route-change`, `skip-links`, `touch-target-size`, `keyboard-nav`.
El CLI de búsqueda no devolvió guías específicas de barra lateral; la estructura sale de esas reglas.

## Estructura

- **≥1024px:** barra superior de 64px (marca, estado de sincronización, tema, usuario y cerrar sesión) + **barra lateral fija de 256px** con desplazamiento propio + área de contenido con ancho máximo de 1200px y relleno de 24/32px.
- **<1024px:** la barra lateral se convierte en un cajón fuera de pantalla que abre un botón "Menú" (ícono + texto) de la barra superior. Cierra con Escape, con el fondo o al navegar; el foco queda atrapado mientras está abierto y vuelve al botón al cerrar.
- La barra lateral es la navegación principal y persiste en todas las pantallas (`persistent-nav`, `navigation-consistency`).

## Contenido de la barra lateral

1. **Inicio** arriba.
2. **Grupos por área**, cada uno con un encabezado pequeño (Administración, Programa anual, Auditorías, Ejecución, Informes, Acciones, Seguimiento, Registros). Solo aparecen las pantallas del rol; las que necesitan un registro elegido no se listan.
3. **Mi cuenta** al final, separado por línea: Notificaciones y Mi perfil.
4. **Cerrar sesión** permanece en la barra superior, lejos de los destinos de navegación (`destructive-nav-separation`).

## Ítem de navegación

- Ícono 20px + texto, altura mínima 44px, espacio de 8px entre ítems (`nav-label-icon`, `touch-target-size`).
- **Activo:** fondo tintado del color primario + peso 600 + `aria-current="page"` (`nav-state-active`). Sin borde lateral de color.
- Hover: cambio de fondo con transición de 200ms. Foco visible con anillo de 2px. `cursor-pointer`.
- Superficie sólida de segunda capa neutra; el glassmorphism se reserva al contenido y al velo del cajón (blur 4px según MASTER).

## Inicio

- Deja de ser un menú. Es un resumen: saludo con rol + cuadrícula de indicadores (4→2→1 columnas) + avisos que requieren atención.
- Los destinos ya no se repiten en la página: están en la barra lateral.

## Accesibilidad

- `nav` con `aria-label="Principal"`; encabezados de grupo asociados a su lista.
- Orden de tabulación: enlace "Saltar al contenido" → barra superior → barra lateral → contenido.
- Al cambiar de ruta el foco pasa al contenido principal (ya existe).
- Respeta `prefers-reduced-motion`.

## Datos

- La lista de destinos por rol sale del servidor (fuente única: los roles y sus pantallas), para que la barra lateral no invente destinos que el rol no tiene.
