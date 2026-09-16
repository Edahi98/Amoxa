import { pgTable, uuid, varchar, integer, boolean } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { organizacion } from '@schemas-organizacion/organizacion.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';
import { importanciaProcesoEnum } from '@schemas/enums.js';

export const proceso = pgTable('proceso', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizacion.id),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  duenoUsuarioId: uuid('dueno_usuario_id')
    .notNull()
    .references((): AnyPgColumn => usuario.id),
  importancia: importanciaProcesoEnum('importancia').notNull(),
  nivelRiesgo: integer('nivel_riesgo').notNull(),
  cambiosRecientes: boolean('cambios_recientes').notNull().default(false),
});
