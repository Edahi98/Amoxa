import { pgTable, uuid, varchar, text } from 'drizzle-orm/pg-core';

export const organizacion = pgTable('organizacion', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  contexto: text('contexto'),
  requisitosPropios: text('requisitos_propios'),
});
