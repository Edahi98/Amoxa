import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { organizacion } from '@schemas-organizacion/organizacion.schema.js';
import { proceso } from '@schemas-organizacion/proceso.schema.js';
import { rolUsuarioEnum } from '@schemas/enums.js';

export const usuario = pgTable('usuario', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizacion.id),
  procesoId: uuid('proceso_id').references((): AnyPgColumn => proceso.id),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  rol: rolUsuarioEnum('rol').notNull(),
});
