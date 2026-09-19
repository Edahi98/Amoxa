import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { accion } from '@schemas-accion/accion.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const accionReporteCierre = pgTable('accion_reporte_cierre', {
  id: uuid('id').primaryKey().defaultRandom(),
  accionId: uuid('accion_id')
    .notNull()
    .references(() => accion.id),
  ciclo: integer('ciclo').notNull().default(1),
  reportadoPorId: uuid('reportado_por_id')
    .notNull()
    .references(() => usuario.id),
  comentario: text('comentario'),
  reportadoEn: timestamp('reportado_en', { withTimezone: true }).notNull().defaultNow(),
});
