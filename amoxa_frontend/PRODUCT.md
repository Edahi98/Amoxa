# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + TypeScript + Vite, Tailwind CSS v4. Backend NestJS + Drizzle + PostgreSQL en un proyecto hermano (`amoxa_backend`). Router: React Router. Decisión ya tomada por el equipo (proyecto existente), no delegada.

## Users

- **Responsable de calidad** — organiza el programa anual de auditorías, arma checklists, aprueba con dirección y responde ante auditores externos de certificación. **Comprador/decisor principal**: el copy de la landing (Home) le habla a este usuario en primera instancia.
- **Auditores internos** — ejecutan el recorrido de auditoría (presencial o remoto), levantan evidencia y hallazgos.
- **Dueños de proceso** — reciben hallazgos y deben corregirlos a tiempo; nunca auditan su propia área.
- **Dirección / gerencia** — necesita visibilidad de resultados (cumplimiento del programa, hallazgos abiertos) sin leer informes largos.

## Product Purpose

Concentra todo el ciclo de auditoría interna (planear, ejecutar, cerrar y mejorar) en un solo lugar, y hace cumplir estructuralmente lo que la norma exige — para que una organización certificada en ISO 9001 pueda prepararse para su auditoría de certificación en horas, no semanas, con evidencia trazable y sin depender de hojas de cálculo, Word y fotos sueltas en el celular.

## Positioning

No es un gestor de tareas genérico ni una suite documental: es la única herramienta que **impide estructuralmente** que se salte un paso que ISO 9001/19011 exige — no deja asignar un auditor sin competencia vigente o con conflicto de interés, no deja registrar una no conformidad sin evidencia, no deja cerrar una auditoría sin enviar el informe a dirección, y no deja cerrar una no conformidad sin que alguien distinto al responsable confirme la eficacia. Un producto vecino podría copiar el flujo; no podría copiar honestamente esas restricciones sin rehacer su modelo de datos.

## Operating Context

- El recorrido de auditoría ocurre en planta u oficina, a veces sin conexión (offline-first en el checklist móvil), con captura de fotos/documentos georreferenciados y con fecha.
- El ciclo sigue el patrón de ISO 19011: planear el programa anual → definir alcance/criterios/método de cada auditoría → ejecutar checklist → registrar hallazgos vinculados a cláusula incumplida → reunión de cierre → informe → acciones correctivas con responsable y fecha límite → verificación de eficacia.
- Los registros nunca se borran (trazabilidad exigida por la norma).

## Capabilities and Constraints

**Permite:**
- Calendario anual de auditorías con prioridad por riesgo/historial.
- Aprobación del programa por dirección, con constancia.
- Ficha de auditor: formación, experiencia, evaluaciones, vigencia.
- Checklists que combinan norma + procedimientos propios.
- Asignación de equipo auditor con verificación de imparcialidad (no autoauditoría).
- Checklist offline-first desde celular, evidencia con foto/documento georreferenciado.
- Hallazgos vinculados a evidencia y cláusula incumplida.
- Informe automático, envío a quien corresponda.
- Acciones correctivas con responsable, fecha límite y alertas de vencimiento.
- Verificación de eficacia antes de cerrar un hallazgo.
- Tablero de cumplimiento del programa, incumplimientos por área, acciones atrasadas.

**Restringe intencionalmente (y esto es parte del producto, no un bug):**
- No publica una lista de verificación que no cubra norma + procedimientos internos.
- No asigna un auditor sin competencia vigente o con conflicto de interés.
- No registra una no conformidad sin evidencia.
- No da por terminada una auditoría sin haber enviado el informe a dirección.
- No cierra una no conformidad sin que alguien distinto al responsable confirme la eficacia.
- No borra registros.

**Terminología del dominio:** auditoría, hallazgo, no conformidad (NC), acción correctiva, criterio, cláusula, evidencia, programa de auditoría, auditor líder, dueño de proceso.

## Brand Commitments

Nombre del producto: **Amoxa**. Sin logo, paleta ni tipografía comprometidos aún — se definen en el trabajo de diseño (no en este documento).

## Evidence on Hand

Ninguna. El proyecto está en diseño (README: "Estado del proyecto: En diseño"), sin clientes, casos de uso reales, testimonios, logos ni cifras de resultados. **Decisión confirmada con el usuario**: el Home omite por completo cualquier prueba social (logos, testimonios, cifras) — no se fabrica evidencia. La propuesta de valor se apoya en el marco normativo (ISO 9001/19011) y en las restricciones estructurales del producto, no en social proof.

## Product Principles

1. La norma no es una checklist de marketing, es la especificación del producto: cada afirmación de valor debe poder rastrearse a una cláusula real de ISO 9001/19011.
2. Las restricciones del producto (lo que NO deja hacer) son una ventaja competitiva, no una limitación a esconder — comunicarlas genera confianza en un comprador que ya sabe lo que un auditor externo revisa.
3. El comprador (responsable de calidad) piensa en riesgo, tiempo de preparación y trazabilidad — no en features sueltas.
4. Sin evidencia real, no se inventa: mejor una landing más corta y honesta que una con prueba social fabricada.
5. El producto vive tanto en oficina como en campo sin conexión — cualquier superficie que hable de la experiencia de auditoría debe reflejar eso, no asumir un usuario siempre conectado en escritorio.

## Accessibility & Inclusion

Sin requisito específico adicional confirmado por el usuario más allá del estándar (WCAG 2.1 AA) ya exigido por las reglas de este proyecto.
