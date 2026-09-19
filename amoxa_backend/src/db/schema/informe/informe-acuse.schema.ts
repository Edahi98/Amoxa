import { pgTable, uuid, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { informe } from '@schemas-informe/informe.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const informeAcuse = pgTable(
  'informe_acuse',
  {
    informeId: uuid('informe_id')
      .notNull()
      .references(() => informe.id),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuario.id),
    leidoEn: timestamp('leido_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.informeId, table.usuarioId] })],
);
