import { pgTable, uuid, text, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { hallazgo } from '@schemas-evidencia/hallazgo.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const aceptacionHallazgo = pgTable(
  'aceptacion_hallazgo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    hallazgoId: uuid('hallazgo_id')
      .notNull()
      .references(() => hallazgo.id),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuario.id),
    acepta: boolean('acepta').notNull(),
    motivo: text('motivo'),
    creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('aceptacion_hallazgo_usuario_uq').on(table.hallazgoId, table.usuarioId)],
);
