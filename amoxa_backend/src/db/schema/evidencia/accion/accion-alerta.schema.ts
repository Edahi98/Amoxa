import { pgTable, uuid, varchar, date, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { accion } from '@schemas-accion/accion.schema.js';

export const accionAlerta = pgTable(
  'accion_alerta',
  {
    accionId: uuid('accion_id')
      .notNull()
      .references(() => accion.id),
    tipo: varchar('tipo', { length: 20 }).notNull(),
    fechaLimite: date('fecha_limite').notNull(),
    enviadaEn: timestamp('enviada_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.accionId, table.tipo, table.fechaLimite] })],
);
