import { pgTable, pgEnum, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { hallazgo } from '@schemas-evidencia/hallazgo.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const momentoRevisionEnum = pgEnum('momento_revision_hallazgo', ['previa', 'cierre']);
export const resultadoAreaEnum = pgEnum('resultado_area_hallazgo', ['aceptado', 'discrepa']);

export const revisionHallazgo = pgTable('revision_hallazgo', {
  id: uuid('id').primaryKey().defaultRandom(),
  hallazgoId: uuid('hallazgo_id')
    .notNull()
    .references(() => hallazgo.id),
  momento: momentoRevisionEnum('momento').notNull(),
  resultadoArea: resultadoAreaEnum('resultado_area'),
  comentario: text('comentario'),
  revisadoPorId: uuid('revisado_por_id')
    .notNull()
    .references(() => usuario.id),
  creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
});
