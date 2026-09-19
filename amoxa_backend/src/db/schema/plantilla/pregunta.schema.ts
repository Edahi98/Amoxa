import { pgTable, uuid, integer, text, varchar, boolean } from 'drizzle-orm/pg-core';
import { plantillaChecklist } from '@schemas-plantilla/plantilla-checklist.schema.js';
import { tipoCriterioEnum, tipoRespuestaEnum } from '@schemas/enums.js';

export const pregunta = pgTable('pregunta', {
  id: uuid('id').primaryKey().defaultRandom(),
  plantillaId: uuid('plantilla_id')
    .notNull()
    .references(() => plantillaChecklist.id),
  orden: integer('orden').notNull(),
  texto: text('texto').notNull(),
  clausulaRef: varchar('clausula_ref', { length: 100 }),
  tipoCriterio: tipoCriterioEnum('tipo_criterio').notNull(),
  tipoRespuesta: tipoRespuestaEnum('tipo_respuesta').notNull(),
  evidenciaObligatoria: boolean('evidencia_obligatoria').notNull().default(false),
});
