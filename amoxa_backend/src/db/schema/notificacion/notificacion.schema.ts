import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const notificacion = pgTable('notificacion', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuario.id),
  tipo: varchar('tipo', { length: 60 }).notNull(),
  titulo: varchar('titulo', { length: 200 }).notNull(),
  mensaje: text('mensaje').notNull(),
  entidadTipo: varchar('entidad_tipo', { length: 100 }),
  entidadId: uuid('entidad_id'),
  creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
  leidaEn: timestamp('leida_en', { withTimezone: true }),
});
