import { pgTable, uuid, text, varchar, timestamp } from 'drizzle-orm/pg-core';
import { plantillaChecklist } from '@schemas-plantilla/plantilla-checklist.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';
import { estadoPropuestaPreguntaEnum, tipoCriterioEnum } from '@schemas/enums.js';

export const propuestaPregunta = pgTable('propuesta_pregunta', {
  id: uuid('id').primaryKey().defaultRandom(),
  plantillaId: uuid('plantilla_id')
    .notNull()
    .references(() => plantillaChecklist.id),
  propuestaPorId: uuid('propuesta_por_id')
    .notNull()
    .references(() => usuario.id),
  texto: text('texto').notNull(),
  clausulaRef: varchar('clausula_ref', { length: 100 }),
  tipoCriterio: tipoCriterioEnum('tipo_criterio').notNull(),
  estado: estadoPropuestaPreguntaEnum('estado').notNull().default('pendiente'),
  resueltaPorId: uuid('resuelta_por_id').references(() => usuario.id),
  resueltaEn: timestamp('resuelta_en', { withTimezone: true }),
  creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
});
