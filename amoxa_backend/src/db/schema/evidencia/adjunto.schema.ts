import { pgTable, uuid, varchar, char, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { respuestaEvidencia } from '@schemas-evidencia/respuesta-evidencia.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';
import { tipoAdjuntoEnum } from '@schemas/enums.js';
import { point } from '@schemas/types.js';

export const adjunto = pgTable('adjunto', {
  id: uuid('id').primaryKey().defaultRandom(),
  respuestaId: uuid('respuesta_id')
    .notNull()
    .references(() => respuestaEvidencia.id),
  tipo: tipoAdjuntoEnum('tipo').notNull(),
  url: varchar('url', { length: 2048 }).notNull(),
  hash: char('hash', { length: 64 }),
  nombreOriginal: varchar('nombre_original', { length: 255 }),
  mime: varchar('mime', { length: 120 }),
  tamanoBytes: integer('tamano_bytes'),
  capturadoEn: timestamp('capturado_en', { withTimezone: true }).notNull().defaultNow(),
  geo: point('geo'),
  almacenado: boolean('almacenado').notNull().default(true),
  clienteId: varchar('cliente_id', { length: 64 }),
  creadoPorId: uuid('creado_por_id').references(() => usuario.id),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
});
