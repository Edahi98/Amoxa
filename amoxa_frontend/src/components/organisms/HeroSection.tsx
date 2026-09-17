import { ArrowRight } from '@phosphor-icons/react';
import { Container } from '@atoms/Container.js';
import { LinkButton } from '@atoms/LinkButton.js';

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
            Lo que esta app no te deja hacer es la razón por la que pasas tu auditoría externa.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Amoxa concentra todo el ciclo de auditoría interna de tu sistema de gestión — planear, ejecutar,
            cerrar y mejorar — y hace cumplir estructuralmente la cláusula 9.2 de ISO 9001:2015 y las
            directrices de ISO 19011:2026. No es una checklist más: es el sistema que no deja avanzar sin la
            evidencia, la imparcialidad y las firmas que un auditor externo va a pedir.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <LinkButton to="/dashboard" size="lg">
              Ir al panel
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
