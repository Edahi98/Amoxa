import { CalendarCheck, ClipboardText, SealCheck } from '@phosphor-icons/react';
import { Container } from '@atoms/Container.js';
import { CycleStep } from '@molecules/CycleStep.js';

const STEPS = [
  {
    icon: CalendarCheck,
    phase: 'Planear',
    title: 'El programa anual, con prioridad y aprobación',
    align: 'left' as const,
    items: [
      'Calendario anual priorizando áreas críticas o con problemas previos.',
      'Envío a aprobación de dirección, con constancia guardada.',
      'Ficha de cada auditor: formación, experiencia, evaluaciones y vigencia.',
      'Checklists que combinan lo que pide la norma con tus procedimientos propios.',
    ],
  },
  {
    icon: ClipboardText,
    phase: 'Ejecutar',
    title: 'El recorrido, en planta o a distancia',
    align: 'right' as const,
    items: [
      'Alcance, criterios y método definidos antes de auditar.',
      'Equipo auditor asignado sin permitir que alguien audite su propia área.',
      'Checklist desde el celular, incluso sin conexión, con evidencia georreferenciada.',
      'Hallazgos vinculados a su evidencia y a la cláusula incumplida.',
    ],
  },
  {
    icon: SealCheck,
    phase: 'Cerrar y mejorar',
    title: 'El informe, las correcciones y su verificación',
    align: 'left' as const,
    items: [
      'Informe generado automáticamente y enviado a quien debe recibirlo.',
      'Acciones correctivas con responsable y fecha límite; alertas si se vencen.',
      'Verificación de eficacia antes de dar por cerrado un hallazgo.',
      'Tablero de cumplimiento, incumplimientos por área y acciones atrasadas.',
    ],
  },
];

export function CycleSection() {
  return (
    <section id="ciclo" className="py-24">
      <Container>
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-balance text-foreground md:text-4xl">
          Un ciclo, no una lista de funciones sueltas
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Cada fase existe porque ISO 19011 la exige en ese orden. Saltarte una no es una opción de
          configuración.
        </p>
        <div className="mt-16 space-y-16 md:space-y-20">
          {STEPS.map((step) => (
            <CycleStep
              key={step.phase}
              icon={step.icon}
              phase={step.phase}
              title={step.title}
              items={step.items}
              align={step.align}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
