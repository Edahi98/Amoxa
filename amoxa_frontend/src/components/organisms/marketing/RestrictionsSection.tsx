import { Container } from '@atoms/Container.js';
import { RestrictionRow } from '@molecules-marketing/RestrictionRow.js';

const RESTRICTIONS = [
  'Publicar una lista de verificación que no cubra tanto la norma como los procedimientos internos.',
  'Asignar a un auditor sin competencia vigente o con conflicto de interés.',
  'Registrar una no conformidad sin evidencia.',
  'Dar por terminada una auditoría sin haber enviado el informe a la dirección.',
  'Cerrar una no conformidad sin que alguien distinto al responsable confirme que la acción fue eficaz.',
  'Borrar registros.',
];

export function RestrictionsSection() {
  return (
    <section id="restricciones" className="py-24">
      <Container>
        <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-16">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-balance text-foreground md:text-4xl">
              Lo que la app no deja hacer, a propósito
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Son los puntos que un auditor externo revisa en una auditoría de certificación. El sistema los
              hace cumplir por diseño, en vez de depender de que el equipo los recuerde.
            </p>
          </div>
          <ul className="rounded-2xl border border-white/60 bg-white/70 px-6 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-800/70">
            {RESTRICTIONS.map((text) => (
              <RestrictionRow key={text} text={text} />
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
