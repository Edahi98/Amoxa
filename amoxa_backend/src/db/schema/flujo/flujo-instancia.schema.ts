import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { auditoria } from '@schemas-auditoria/auditoria.schema.js';
import { organizacion } from '@schemas-organizacion/organizacion.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const flujoInstancia = pgTable(
  'flujo_instancia',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizacionId: uuid('organizacion_id')
      .notNull()
      .references(() => organizacion.id),
    flujoId: varchar('flujo_id', { length: 80 }).notNull(),
    auditoriaId: uuid('auditoria_id')
      .notNull()
      .references(() => auditoria.id),
    iniciadoPorId: uuid('iniciado_por_id')
      .notNull()
      .references(() => usuario.id),
    iniciadoEn: timestamp('iniciado_en', { withTimezone: true }).notNull().defaultNow(),
    completadoEn: timestamp('completado_en', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('flujo_instancia_activa_por_auditoria')
      .on(table.flujoId, table.auditoriaId)
      .where(sql`${table.completadoEn} is null`),
    index('flujo_instancia_organizacion_idx').on(table.organizacionId),
  ],
);
