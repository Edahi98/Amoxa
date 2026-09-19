import { pgTable, uuid, integer, unique, timestamp } from 'drizzle-orm/pg-core';
import { programaAuditoria } from '@schemas-programa/programa-auditoria.schema.js';
import { proceso } from '@schemas-organizacion/proceso.schema.js';

export const programaProceso = pgTable(
  'programa_proceso',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    programaId: uuid('programa_id')
      .notNull()
      .references(() => programaAuditoria.id),
    procesoId: uuid('proceso_id')
      .notNull()
      .references(() => proceso.id),
    orden: integer('orden').notNull(),
    puntajeSugerido: integer('puntaje_sugerido').notNull().default(0),
    retiradoEn: timestamp('retirado_en', { withTimezone: true }),
  },
  (table) => [unique('programa_proceso_unico').on(table.programaId, table.procesoId)],
);
