import { z } from 'zod';
import { BodyPart } from '@validators-ejecucion/body-part.js';
import { OptionalValue } from '@validators-ejecucion/optional-value.js';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

const safeText = new SafeTextValidator();

export const CrearHallazgoSchema = BodyPart.of(
  'hallazgo',
  z.looseObject({
    tipo: z.enum(['nc_mayor', 'nc_menor', 'observacion', 'oportunidad', 'conformidad', 'buena_practica']),
    respuesta_id: z.uuid(),
    proceso: OptionalValue.of(z.uuid()),
    clausula: OptionalValue.of(safeText.wrap(z.string().max(255))),
    descripcion: safeText.wrap(z.string().min(1).max(4000)),
  }),
);

export type CrearHallazgoInput = z.infer<typeof CrearHallazgoSchema>;
