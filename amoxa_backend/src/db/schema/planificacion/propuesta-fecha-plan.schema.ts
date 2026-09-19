import { pgTable, uuid, date, text, varchar, timestamp } from 'drizzle-orm/pg-core';
import { auditoria } from '@schemas-auditoria/auditoria.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const propuestaFechaPlan = pgTable('propuesta_fecha_plan', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditoriaId: uuid('auditoria_id')
    .notNull()
    .references(() => auditoria.id),
  propuestaPorId: uuid('propuesta_por_id')
    .notNull()
    .references(() => usuario.id),
  fechaPropuesta: date('fecha_propuesta').notNull(),
  motivo: text('motivo'),
  estado: varchar('estado', { length: 20 }).notNull().default('pendiente'),
  creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
});
