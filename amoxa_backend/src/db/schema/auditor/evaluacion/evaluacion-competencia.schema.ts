import { pgTable, uuid, varchar, date } from 'drizzle-orm/pg-core';
import { auditor } from '@schemas-auditor/auditor.schema.js';
import { evaluacionAuditor } from '@schemas-auditor-evaluacion/evaluacion-auditor.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';
import { metodoEvaluacionCompetenciaEnum } from '@schemas/enums.js';

export const evaluacionCompetencia = pgTable('evaluacion_competencia', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditorId: uuid('auditor_id')
    .notNull()
    .references(() => auditor.usuarioId),
  evaluacionId: uuid('evaluacion_id').references(() => evaluacionAuditor.id),
  metodo: metodoEvaluacionCompetenciaEnum('metodo').notNull(),
  resultado: varchar('resultado', { length: 255 }),
  fecha: date('fecha').notNull(),
  evaluadorId: uuid('evaluador_id')
    .notNull()
    .references(() => usuario.id),
});
