import { ArrowRight } from '@phosphor-icons/react';
import { Container } from '@atoms/Container.js';
import { LinkButton } from '@atoms/LinkButton.js';

export function FinalCtaSection() {
  return (
    <section className="py-24">
      <Container>
        <div className="rounded-3xl border border-white/60 bg-gradient-to-br from-primary to-secondary px-8 py-16 text-center shadow-lg md:px-16">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-balance text-on-primary md:text-4xl">
            Prepara tu próxima auditoría de certificación en horas, no en semanas.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-on-primary/90">
            Evidencia trazable, seguimiento real de acciones correctivas y visibilidad para dirección — sin
            depender de que alguien arme un reporte a mano.
          </p>
          <div className="mt-10 flex justify-center">
            <LinkButton to="/dashboard" size="lg" variant="primary">
              Ir al panel
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </LinkButton>
          </div>
        </div>
      </Container>
    </section>
  );
}
