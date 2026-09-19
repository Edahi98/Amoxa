import { pgTable, uuid, primaryKey, timestamp } from 'drizzle-orm/pg-core';
import { auditoria } from '@schemas-auditoria/auditoria.schema.js';
import { proceso } from '@schemas-organizacion/proceso.schema.js';

export const auditoriaProceso = pgTable(
  'auditoria_proceso',
  {
    auditoriaId: uuid('auditoria_id')
      .notNull()
      .references(() => auditoria.id),
    procesoId: uuid('proceso_id')
      .notNull()
      .references(() => proceso.id),
    retiradoEn: timestamp('retirado_en', { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.auditoriaId, table.procesoId] })],
);
