import { pgTable, uuid, boolean, text, timestamp } from 'drizzle-orm/pg-core';
import { auditoria } from '@schemas-auditoria/auditoria.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const contactoAuditoria = pgTable('contacto_auditoria', {
  auditoriaId: uuid('auditoria_id')
    .primaryKey()
    .references(() => auditoria.id),
  informacionSuficiente: boolean('informacion_suficiente').notNull().default(false),
  cooperacion: boolean('cooperacion').notNull().default(false),
  tiempo: boolean('tiempo').notNull().default(false),
  observaciones: text('observaciones'),
  confirmadoPorId: uuid('confirmado_por_id').references(() => usuario.id),
  confirmadoEn: timestamp('confirmado_en', { withTimezone: true }),
  respuestaArea: text('respuesta_area'),
  respondidoPorId: uuid('respondido_por_id').references(() => usuario.id),
  respondidoEn: timestamp('respondido_en', { withTimezone: true }),
});
