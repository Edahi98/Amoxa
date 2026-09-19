import { z } from 'zod';
import { BodySection } from '@validators-auditorias/body-section.js';

export const EquipoSchema = BodySection.of(
  'equipo',
  z.object({
    miembros: z.array(z.uuid()).max(50).default([]),
  }),
);

export type EquipoInput = z.infer<typeof EquipoSchema>;
