import { pgTable, uuid, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { organizacion } from '@schemas-organizacion/organizacion.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';
import { estadoPlantillaEnum } from '@schemas/enums.js';

export const plantillaChecklist = pgTable('plantilla_checklist', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id').references(() => organizacion.id),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  version: integer('version').notNull().default(1),
  vigente: boolean('vigente').notNull().default(true),
  estado: estadoPlantillaEnum('estado').notNull().default('borrador'),
  origenId: uuid('origen_id'),
  creadoPorId: uuid('creado_por_id').references(() => usuario.id),
  publicadaEn: timestamp('publicada_en', { withTimezone: true }),
  publicadaPorId: uuid('publicada_por_id').references(() => usuario.id),
});
