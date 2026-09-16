import { pgTable, uuid, varchar, integer, char, timestamp, date } from 'drizzle-orm/pg-core';
import { usuario } from '@schemas-organizacion/usuario.schema.js';
import { confidencialidadEnum } from '@schemas/enums.js';

export const informacionDocumentada = pgTable('informacion_documentada', {
  id: uuid('id').primaryKey().defaultRandom(),
  entidadTipo: varchar('entidad_tipo', { length: 100 }).notNull(),
  entidadId: uuid('entidad_id').notNull(),
  version: integer('version').notNull().default(1),
  hash: char('hash', { length: 64 }),
  creadoPorId: uuid('creado_por_id')
    .notNull()
    .references(() => usuario.id),
  fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
  retencionHasta: date('retencion_hasta'),
  confidencialidad: confidencialidadEnum('confidencialidad').notNull().default('interno'),
});
