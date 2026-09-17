import { ArrowRight } from '@phosphor-icons/react';
import { Container } from '@atoms/Container.js';
import { LinkButton } from '@atoms-button/LinkButton.js';

export function FinalCtaSection() {
  return (
    <section className="py-24">
      <Container>
        <div className="rounded-3xl border border-white/60 bg-gradient-to-br from-primary to-secondary px-8 py-16 text-center shadow-lg md:px-16">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-balance text-on-primary md:text-4xl">
            Antes de una auditoría de certificación, el sistema conserva la evidencia, las acciones
            correctivas y los registros que revisa un auditor externo.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-on-primary/90">
            Evidencia trazable, acciones correctivas con responsable y fecha límite, e informes que
            dirección puede revisar sin pedirlos aparte.
          </p>
          <div className="mt-10 flex justify-center">
            <LinkButton to="/login" size="lg" variant="primary">
              Iniciar sesión
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </LinkButton>
          </div>
        </div>
      </Container>
    </section>
  );
}
