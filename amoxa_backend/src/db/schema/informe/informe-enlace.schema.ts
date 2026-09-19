import { char, index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { informe } from '@schemas-informe/informe.schema.js';
import { organizacion } from '@schemas-organizacion/organizacion.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const informeEnlace = pgTable(
  'informe_enlace',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    informeId: uuid('informe_id')
      .notNull()
      .references(() => informe.id),
    organizacionId: uuid('organizacion_id')
      .notNull()
      .references(() => organizacion.id),
    tokenHash: char('token_hash', { length: 64 }).notNull().unique(),
    creadoPorId: uuid('creado_por_id')
      .notNull()
      .references(() => usuario.id),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    expiraEn: timestamp('expira_en', { withTimezone: true }).notNull(),
    revocadoEn: timestamp('revocado_en', { withTimezone: true }),
  },
  (table) => [index('informe_enlace_informe_idx').on(table.informeId)],
);
