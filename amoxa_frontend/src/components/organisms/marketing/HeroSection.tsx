import { ArrowRight } from '@phosphor-icons/react';
import { Container } from '@atoms-layout/Container.js';
import { LinkButton } from '@atoms-button/LinkButton.js';

export function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[-12rem] h-[32rem] bg-gradient-to-b from-primary/15 via-secondary/10 to-transparent blur-3xl"
      />
      <Container className="relative">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground md:text-6xl">
            Amoxa hace cumplir, dentro del sistema, las restricciones que ISO 9001 y ISO 19011 exigen en
            una auditoría interna.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Concentra el ciclo de auditoría interna — planear, ejecutar, cerrar y mejorar — y aplica la
            cláusula 9.2 de ISO 9001:2015 y las directrices de ISO 19011:2026: no deja avanzar sin
            evidencia, verificación de imparcialidad y los registros que una auditoría externa revisa.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <LinkButton to="/login" size="lg">
              Iniciar sesión
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </LinkButton>
            <a
              href="#restricciones"
              className="inline-flex h-14 items-center gap-2 rounded-lg border border-border bg-white/60 px-7 text-base font-semibold text-foreground backdrop-blur-md transition-colors duration-200 hover:bg-white/90 dark:bg-slate-800/60 dark:hover:bg-slate-800/90"
            >
              Ver qué no te deja hacer
            </a>
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            Alineado a ISO 9001:2015 (9.2, 9.3, 10.2, 7.5) · ISO 19011:2026 · ISO/IEC TS 17012:2024
          </p>
        </div>
      </Container>
    </section>
  );
}
