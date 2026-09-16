import { pgTable, uuid, varchar, char } from 'drizzle-orm/pg-core';
import { respuestaEvidencia } from '@schemas-evidencia/respuesta-evidencia.schema.js';
import { tipoAdjuntoEnum } from '@schemas/enums.js';

export const adjunto = pgTable('adjunto', {
  id: uuid('id').primaryKey().defaultRandom(),
  respuestaId: uuid('respuesta_id')
    .notNull()
    .references(() => respuestaEvidencia.id),
  tipo: tipoAdjuntoEnum('tipo').notNull(),
  url: varchar('url', { length: 2048 }).notNull(),
  hash: char('hash', { length: 64 }),
});
