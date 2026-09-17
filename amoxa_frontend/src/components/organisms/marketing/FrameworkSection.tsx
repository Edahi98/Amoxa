import { Container } from '@atoms/Container.js';

const REFERENCES = [
  {
    standard: 'ISO 9001:2015',
    detail: 'Cláusula 9.2 (auditoría interna), 9.3 (revisión por la dirección), 10.2 (acciones correctivas) y 7.5 (información documentada).',
  },
  {
    standard: 'ISO 19011:2026',
    detail: 'Directrices para la auditoría de sistemas de gestión.',
  },
  {
    standard: 'ISO/IEC TS 17012:2024',
    detail: 'Métodos de auditoría remota.',
  },
];

export function FrameworkSection() {
  return (
    <section id="marco" className="border-y border-white/50 bg-white/50 py-20 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/40">
      <Container>
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Marco de referencia</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {REFERENCES.map((reference) => (
            <div key={reference.standard}>
              <p className="text-base font-semibold text-primary">{reference.standard}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{reference.detail}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
