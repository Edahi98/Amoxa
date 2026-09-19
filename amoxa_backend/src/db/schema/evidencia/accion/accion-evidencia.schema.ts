import { pgTable, uuid, varchar, char, integer, timestamp } from 'drizzle-orm/pg-core';
import { accion } from '@schemas-accion/accion.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const accionEvidencia = pgTable('accion_evidencia', {
  id: uuid('id').primaryKey().defaultRandom(),
  accionId: uuid('accion_id')
    .notNull()
    .references(() => accion.id),
  etapa: varchar('etapa', { length: 20 }).notNull(),
  ciclo: integer('ciclo').notNull().default(1),
  nombre: varchar('nombre', { length: 255 }),
  url: varchar('url', { length: 2048 }),
  tipo: varchar('tipo', { length: 30 }),
  hash: char('hash', { length: 64 }),
  creadoPorId: uuid('creado_por_id')
    .notNull()
    .references(() => usuario.id),
  creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
});
