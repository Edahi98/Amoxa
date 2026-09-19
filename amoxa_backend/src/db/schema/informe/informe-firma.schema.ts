import { pgTable, uuid, text, char, timestamp } from 'drizzle-orm/pg-core';
import { informe } from '@schemas-informe/informe.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const informeFirma = pgTable('informe_firma', {
  informeId: uuid('informe_id')
    .primaryKey()
    .references(() => informe.id),
  firmanteId: uuid('firmante_id')
    .notNull()
    .references(() => usuario.id),
  firma: text('firma').notNull(),
  huella: char('huella', { length: 64 }).notNull(),
  firmadoEn: timestamp('firmado_en', { withTimezone: true }).notNull().defaultNow(),
});
