import { pgTable, uuid, text, boolean, timestamp, integer, varchar, uniqueIndex } from 'drizzle-orm/pg-core';
import { auditoria } from '@schemas-auditoria/auditoria.schema.js';
import { pregunta } from '@schemas-plantilla/pregunta.schema.js';
import { auditor } from '@schemas-auditor/auditor.schema.js';
import { resultadoRespuestaEnum } from '@schemas/enums.js';
import { point } from '@schemas/types.js';

export const respuestaEvidencia = pgTable(
  'respuesta_evidencia',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    auditoriaId: uuid('auditoria_id')
      .notNull()
      .references(() => auditoria.id),
    preguntaId: uuid('pregunta_id')
      .notNull()
      .references(() => pregunta.id),
    auditorId: uuid('auditor_id')
      .notNull()
      .references(() => auditor.usuarioId),
    resultado: resultadoRespuestaEnum('resultado').notNull(),
    comentario: text('comentario'),
    verificada: boolean('verificada').notNull().default(false),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
    geo: point('geo'),
    version: integer('version').notNull().default(1),
    codigoReferencia: varchar('codigo_referencia', { length: 200 }),
    claveIdempotencia: varchar('clave_idempotencia', { length: 100 }),
  },
  (table) => [uniqueIndex('respuesta_evidencia_auditoria_pregunta_uq').on(table.auditoriaId, table.preguntaId)],
);
