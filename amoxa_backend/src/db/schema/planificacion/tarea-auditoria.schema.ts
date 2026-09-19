import { pgTable, uuid, integer, text, index } from 'drizzle-orm/pg-core';
import { auditoria } from '@schemas-auditoria/auditoria.schema.js';
import { auditor } from '@schemas-auditor/auditor.schema.js';

export const tareaAuditoria = pgTable(
  'tarea_auditoria',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    auditoriaId: uuid('auditoria_id')
      .notNull()
      .references(() => auditoria.id),
    planVersion: integer('plan_version').notNull(),
    auditorId: uuid('auditor_id')
      .notNull()
      .references(() => auditor.usuarioId),
    orden: integer('orden').notNull(),
    descripcion: text('descripcion').notNull(),
  },
  (table) => [index('tarea_auditoria_auditoria_idx').on(table.auditoriaId, table.planVersion)],
);
