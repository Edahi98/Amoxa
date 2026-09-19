import { pgTable, uuid, integer, date, text, index } from 'drizzle-orm/pg-core';
import { auditoria } from '@schemas-auditoria/auditoria.schema.js';

export const agendaAuditoria = pgTable(
  'agenda_auditoria',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    auditoriaId: uuid('auditoria_id')
      .notNull()
      .references(() => auditoria.id),
    planVersion: integer('plan_version').notNull(),
    orden: integer('orden').notNull(),
    fecha: date('fecha'),
    actividad: text('actividad').notNull(),
  },
  (table) => [index('agenda_auditoria_auditoria_idx').on(table.auditoriaId, table.planVersion)],
);
