import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { programaAuditoria } from '@schemas-programa/programa-auditoria.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const leccionAprendida = pgTable('leccion_aprendida', {
  id: uuid('id').primaryKey().defaultRandom(),
  programaId: uuid('programa_id')
    .notNull()
    .references(() => programaAuditoria.id),
  texto: text('texto').notNull(),
  creadoPorId: uuid('creado_por_id')
    .notNull()
    .references(() => usuario.id),
  creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
});
