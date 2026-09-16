import { pgTable, uuid, varchar, integer, boolean } from 'drizzle-orm/pg-core';

export const plantillaChecklist = pgTable('plantilla_checklist', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  version: integer('version').notNull().default(1),
  vigente: boolean('vigente').notNull().default(true),
});
