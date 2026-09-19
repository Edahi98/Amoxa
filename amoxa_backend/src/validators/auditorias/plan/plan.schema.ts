import { z } from 'zod';
import { BodySection } from '@validators-auditorias/body-section.js';
import { OptionalField } from '@validators-auditorias/optional-field.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

const agendaItem = z.union([
  safeText.wrap(z.string().max(500)),
  z.object({ fecha: OptionalField.of(z.iso.date()), actividad: safeText.wrap(z.string().min(1).max(500)) }),
]);

const tareaItem = z.object({ auditorId: z.uuid(), descripcion: safeText.wrap(z.string().min(1).max(1000)) });

export const PlanSchema = BodySection.of(
  'plan',
  z.object({
    fecha_inicio: OptionalField.of(z.iso.date()),
    fecha_fin: OptionalField.of(z.iso.date()),
    agenda: z.union([safeText.wrap(z.string().max(8000)), z.array(agendaItem).max(200), z.null()]).optional(),
    tareas: z.union([safeText.wrap(z.string().max(8000)), z.array(tareaItem).max(200), z.null()]).optional(),
  }),
);

export type PlanInput = z.infer<typeof PlanSchema>;
