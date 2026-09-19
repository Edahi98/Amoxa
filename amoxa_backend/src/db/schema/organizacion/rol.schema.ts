import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';

export const rol = pgTable('rol', {
  id: uuid('id').primaryKey().defaultRandom(),
  clave: varchar('clave', { length: 50 }).notNull().unique(),
  codigo: varchar('codigo', { length: 2 }).notNull().unique(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
});
