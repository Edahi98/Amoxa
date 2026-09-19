import { pgTable, uuid, text, date, timestamp } from 'drizzle-orm/pg-core';
import { auditor } from '@schemas-auditor/auditor.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';
import { estadoAuditorEnum, resultadoEvaluacionAuditorEnum } from '@schemas/enums.js';

export const evaluacionAuditor = pgTable('evaluacion_auditor', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditorId: uuid('auditor_id')
    .notNull()
    .references(() => auditor.usuarioId),
  evaluadorId: uuid('evaluador_id')
    .notNull()
    .references(() => usuario.id),
  fecha: date('fecha').notNull(),
  resultado: resultadoEvaluacionAuditorEnum('resultado').notNull(),
  observaciones: text('observaciones'),
  estadoResultante: estadoAuditorEnum('estado_resultante').notNull(),
  vigenciaHasta: date('vigencia_hasta'),
  creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
});
