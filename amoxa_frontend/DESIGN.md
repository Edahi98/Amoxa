---
name: Amoxa
description: SaaS B2B de auditorías internas ISO 9001/19011 — confianza normativa, no vitrina de features.
colors:
  primary: "#2563EB"
  on-primary: "#FFFFFF"
  secondary: "#3B82F6"
  on-secondary: "#000000"
  accent: "#EA580C"
  on-accent: "#FFFFFF"
  background: "#F8FAFC"
  foreground: "#1E293B"
  card: "#FFFFFF"
  card-foreground: "#1E293B"
  muted: "#E9EFF8"
  muted-foreground: "#475569"
  border: "#E2E8F0"
  destructive: "#DC2626"
  on-destructive: "#FFFFFF"
  ring: "#2563EB"
  dark-background: "#0F172A"
  dark-foreground: "#F1F5F9"
  dark-card: "#1E293B"
  dark-card-foreground: "#F1F5F9"
  dark-muted: "#1E293B"
  dark-muted-foreground: "#CBD5E1"
  dark-border: "#334155"
  dark-destructive: "#F87171"
  dark-on-destructive: "#1E293B"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, system-ui, 'Segoe UI', sans-serif"
    fontSize: "clamp(2.25rem, 4vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
spacing:
  sm: "16px"
  md: "24px"
  lg: "64px"
  xl: "96px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.sm}"
    padding: "0 20px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: "0 20px"
    height: "44px"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "0 28px"
    height: "56px"
  card-glass:
    backgroundColor: "rgba(255,255,255,0.7)"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
---

# Design System: Amoxa

## Overview

**Creative North Star: "El expediente que no te deja mentir"**

Amoxa no vende una lista de funciones: vende que el sistema hace cumplir, por diseño, exactamente lo que
un auditor externo va a revisar. La superficie visual es sobria, de confianza corporativa (azul), con un
único acento cálido (naranja) reservado casi exclusivamente para la acción principal. El vidrio esmerilado
(glassmorphism ligero: fondo translúcido + `backdrop-blur`) se usa para dar profundidad a los paneles que
contienen la prueba real del producto — el ciclo de auditoría y la lista de restricciones — nunca como
decoración gratuita. Se rechazó explícitamente: el "eyebrow"/kicker sobre encabezados, filas de cards
idénticas como estructura completa de página, y cualquier prueba social inventada (logos, testimonios,
cifras) mientras el producto siga "en diseño" (ver PRODUCT.md).

**Key Characteristics:**
- Confianza normativa antes que entusiasmo de producto: el copy cita cláusulas reales, no adjetivos.
- Un solo acento (naranja) para la acción primaria; todo lo demás vive en azul/neutros.
- Profundidad vía vidrio esmerilado en paneles de contenido real, no en tarjetas decorativas.
- Tipografía única (Plus Jakarta Sans) en todos los pesos — sin mezclar familias.

## Colors

Paleta de confianza B2B: azul como color de marca/estructura, un único acento naranja reservado para la
conversión.

### Primary
- **Azul Confianza** (`#2563EB`): marca, enlaces de acción secundaria, CTA de navegación ("Ir al panel"),
  franja de gradiente decorativa del hero, sección final de CTA (como fondo, en degradado con Secondary).

### Secondary
- **Azul Cielo** (`#3B82F6`): extremo del degradado de la sección de CTA final; nunca se usa solo.

### Tertiary
- **Naranja Acento** (`#EA580C`): reservado casi en exclusiva para el botón primario ("Ir al panel" en el
  hero, CTA final). Su escasez es la señal de "esta es la acción".

### Neutral
- **Fondo** (`#F8FAFC`): fondo base de toda la página.
- **Superficie/Card** (`#FFFFFF`, a menudo con opacidad ~70% + blur): paneles de vidrio (ciclo, restricciones).
- **Texto principal** (`#1E293B`): titulares y cuerpo sobre fondo claro.
- **Texto secundario** (`#475569`): subtítulos, listas de capacidades, pie de página.
- **Borde** (`#E2E8F0`): bordes de botones outline y separadores.
- **Destructivo** (`#DC2626`): únicamente en los íconos "prohibido" de la sección de restricciones.

### Dark Mode
No es una inversión del tema claro: fondos y superficies se llevan a una escala slate desaturada (no
negro puro), y `on-destructive` se ajusta a un rojo más claro (`#F87171`) sobre superficie oscura en vez
del rojo saturado del modo claro. Marca (`primary`/`secondary`/`accent` y sus `on-*`) **no cambia** entre
temas — ya están validados contra texto blanco sobre relleno sólido, independientes del fondo de página.
- **Fondo** (`#0F172A`, slate-900): fondo base en oscuro.
- **Superficie/Card** (`#1E293B`, slate-800, con opacidad para vidrio): paneles de ciclo/restricciones/header.
- **Texto principal** (`#F1F5F9`): titulares y cuerpo.
- **Texto secundario** (`#CBD5E1`): se sube un peldaño respecto al claro (slate-400→slate-300) para
  mantener ≥4.5:1 sobre el fondo oscuro.
- **Borde** (`#334155`, slate-700): separadores visibles sin ser un halo blanco perdido en el fondo oscuro.
- **Destructivo** (`#F87171`): rojo aclarado para mantener contraste sobre superficie oscura.

Selector: clase `.dark` en `<html>` (no solo `prefers-color-scheme`), para permitir el toggle manual del
header. Se respeta la preferencia del sistema como valor inicial y se persiste la elección del usuario en
`localStorage`.

### Named Rules
**La regla del acento único.** El naranja (`--color-accent`) solo aparece en botones de acción primaria.
Si aparece en más de un elemento por viewport, algo se rompió la regla.

**La regla de la marca fija.** Los colores de marca (`primary`, `secondary`, `accent` y sus `on-*`) tienen
el mismo valor en claro y oscuro. Lo que cambia entre temas es la superficie (fondo/card/borde/texto), no
la marca.

## Typography

**Display Font:** Plus Jakarta Sans (system-ui, 'Segoe UI', sans-serif de respaldo)
**Body Font:** Plus Jakarta Sans (misma familia, pesos 400–500)

**Character:** Una sola familia tipográfica en todos los pesos (300–700) — geométrica, legible, sin
personalidad juguetona; se eligió específicamente porque el patrón de producto (SaaS B2B / compliance)
lo señala como el mejor ajuste, no por default de plantilla.

### Hierarchy
- **Display** (700, `text-4xl` a `text-6xl` según breakpoint, `leading-tight`, `text-balance`): titular del hero.
- **Headline** (700, `text-3xl` a `text-4xl`): títulos de sección (`El ciclo`, `Lo que no deja hacer`, CTA final).
- **Title** (600, `text-xl`): título de cada fase del ciclo; nombre de cada norma en "Marco de referencia".
- **Body** (400, `text-sm`/`text-base`, `leading-relaxed`, `text-muted-foreground`): párrafos de apoyo, listas de capacidades.
- **Label** (500, `text-sm`): enlaces de navegación, texto de botones.

## Layout

Contenedor centrado `max-w-6xl` con `px-6`, usado en cada sección (`Container` atom) — nunca un ancho
distinto entre secciones. Ritmo vertical por sección: `py-20` a `py-24` (más generoso que el interior de
cada componente). Mobile-first: la navegación colapsa (`hidden md:flex`), el ciclo pasa de una columna a
alternancia izquierda/derecha en `md:`, la sección de restricciones pasa de una columna a dos (`md:grid-cols-[1fr_1.2fr]`).
Sin scroll horizontal en ningún breakpoint.

## Elevation & Depth

Sistema híbrido: la mayoría de la superficie es plana (fondo sólido `--color-background`), y la
profundidad aparece solo en paneles de vidrio esmerilado que contienen contenido real (el ciclo, la lista
de restricciones, el header sticky). No hay sombras duras ni "glow" de color con offset cero.

### Shadow Vocabulary
- **Panel de vidrio** (`shadow-sm` + `backdrop-blur-md` + `border border-white/60` sobre `bg-white/70`): paneles de contenido flotante.
- **Card hover** (`shadow-sm` → `shadow-md` en 200ms): reservado para elementos interactivos, no decorativos.

### Named Rules
**La regla del vidrio con propósito.** `backdrop-blur` solo se usa donde hay contenido real detrás
(header sticky sobre el hero, paneles de ciclo/restricciones) — nunca como textura decorativa vacía.

## Shapes

Radios generosos y consistentes: `rounded-lg` (8px) en botones y filas pequeñas, `rounded-2xl` (16px) en
paneles de contenido (ciclo, restricciones), `rounded-3xl` (24px) en el panel de CTA final. Sin bordes de
color a la izquierda/derecha en cards ni callouts.

## Components

### Buttons
- **Shape:** `rounded-lg` (8px), altura fija `h-11` (44px, cumple mínimo táctil) o `h-14` (56px) en tamaño `lg`.
- **Primary:** fondo `accent` (naranja), texto blanco — única acción por viewport.
- **Secondary:** fondo `primary` (azul), texto blanco — usado en la navegación ("Ir al panel").
- **Outline:** fondo `card` translúcido + borde, usado como CTA secundaria del hero ("Ver qué no te deja hacer").
- **Hover:** oscurecimiento de fondo (`/90` de opacidad) en 200ms; foco visible con `outline-ring` de 2px.

### Cards / Containers (paneles de vidrio)
- **Corner Style:** `rounded-2xl`.
- **Background:** `bg-white/70` + `backdrop-blur-md`.
- **Shadow Strategy:** ver Elevation & Depth — `shadow-sm`.
- **Border:** `border border-white/60`.
- **Internal Padding:** `px-6` (lista de restricciones), `p-6` genérico.

### Navigation
- Header `sticky top-0`, fondo `bg-white/70` + `backdrop-blur-md`, enlaces en `muted-foreground` que pasan
  a `foreground` en hover, sin subrayado. En mobile, solo logo + CTA (los enlaces de ancla se colapsan).

### Restricciones (componente de firma)
Lista de "lo que la app no deja hacer": cada fila lleva un ícono `Prohibit` (Phosphor) en círculo rojo
tenue (`bg-destructive/10 text-destructive`) + el texto de la restricción, dentro de un único panel de
vidrio (no seis tarjetas repetidas). Es el componente que más carga la tesis del producto.

## Do's and Don'ts

### Do:
- **Do** usar `Container` (`max-w-6xl`, `px-6`) en cada sección nueva de una página de marketing.
- **Do** citar cláusulas/normas reales (ISO 9001, ISO 19011) en vez de adjetivos de marketing genéricos.
- **Do** mantener el naranja (`accent`) exclusivo para la acción primaria por viewport.
- **Do** usar `backdrop-blur` solo sobre paneles con contenido real detrás.

### Don't:
- **Don't** poner un eyebrow/kicker sobre un encabezado — el encabezado lleva su propio peso.
- **Don't** usar una grilla de cards idénticas (ícono + título + texto) como estructura completa de una
  página nueva; está bien como un componente puntual, nunca como "la" estructura.
- **Don't** inventar prueba social (logos, testimonios, cifras) mientras PRODUCT.md registre que el
  producto no tiene evidencia real — ver `## Evidence on Hand`.
- **Don't** mezclar familias tipográficas; todo es Plus Jakarta Sans.
- **Don't** usar `border-l`/`border-r` de color como decoración de card o callout.
