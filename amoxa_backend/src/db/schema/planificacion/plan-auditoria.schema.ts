import { pgTable, uuid, date, integer, varchar, timestamp } from 'drizzle-orm/pg-core';
import { auditoria } from '@schemas-auditoria/auditoria.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const planAuditoria = pgTable('plan_auditoria', {
  auditoriaId: uuid('auditoria_id')
    .primaryKey()
    .references(() => auditoria.id),
  fechaInicio: date('fecha_inicio'),
  fechaFin: date('fecha_fin'),
  version: integer('version').notNull().default(1),
  estado: varchar('estado', { length: 20 }).notNull().default('borrador'),
  elaboradoPorId: uuid('elaborado_por_id').references(() => usuario.id),
  enviadoEn: timestamp('enviado_en', { withTimezone: true }),
  respondidoPorId: uuid('respondido_por_id').references(() => usuario.id),
  respondidoEn: timestamp('respondido_en', { withTimezone: true }),
});
