import { pgTable, pgEnum, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { programaAuditoria } from '@schemas-programa/programa-auditoria.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const tipoRevisionDireccionEnum = pgEnum('tipo_revision_direccion', ['presentacion', 'decision']);

export const revisionDireccion = pgTable('revision_direccion', {
  id: uuid('id').primaryKey().defaultRandom(),
  programaId: uuid('programa_id')
    .notNull()
    .references(() => programaAuditoria.id),
  tipo: tipoRevisionDireccionEnum('tipo').notNull(),
  resumen: text('resumen'),
  indicadores: jsonb('indicadores'),
  decisiones: text('decisiones'),
  recursos: text('recursos'),
  creadoPorId: uuid('creado_por_id')
    .notNull()
    .references(() => usuario.id),
  creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
});
