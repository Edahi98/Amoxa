import { z } from 'zod';
import { OptionalValue } from '@validators-ejecucion/optional-value.js';

const ClienteIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

export const ArchivoDeclaradoSchema = z.looseObject({
  id: ClienteIdSchema,
  name: z.string().min(1).max(255),
  size: z.number().int().min(0),
  mimeType: z.string().min(1).max(120),
  capturedAt: OptionalValue.of(z.iso.datetime({ offset: true })),
  latitude: OptionalValue.of(z.number().min(-90).max(90)),
  longitude: OptionalValue.of(z.number().min(-180).max(180)),
  sha256: OptionalValue.of(Sha256Schema),
});

const UbicacionSchema = z.looseObject({
  latitude: OptionalValue.of(z.number().min(-90).max(90)),
  longitude: OptionalValue.of(z.number().min(-180).max(180)),
});

export const SubirEvidenciaSchema = z.looseObject({
  clienteId: OptionalValue.of(ClienteIdSchema),
  capturadoEn: OptionalValue.of(z.iso.datetime({ offset: true })),
  latitud: OptionalValue.of(z.coerce.number().min(-90).max(90)),
  longitud: OptionalValue.of(z.coerce.number().min(-180).max(180)),
  sha256: OptionalValue.of(Sha256Schema),
  tipo: OptionalValue.of(z.enum(['foto', 'doc', 'captura', 'video'])),
  archivos: z.array(ArchivoDeclaradoSchema).max(50).optional(),
  evidencia: z
    .looseObject({
      archivos: z.array(ArchivoDeclaradoSchema).max(50).optional(),
      ubicacion: UbicacionSchema.nullish(),
      verificada: z.boolean().optional(),
    })
    .optional(),
});

export type SubirEvidenciaInput = z.infer<typeof SubirEvidenciaSchema>;
export type ArchivoDeclarado = z.infer<typeof ArchivoDeclaradoSchema>;
