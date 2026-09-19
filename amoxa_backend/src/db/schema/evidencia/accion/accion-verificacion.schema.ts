import { pgTable, uuid, text, boolean, integer, date, timestamp } from 'drizzle-orm/pg-core';
import { accion } from '@schemas-accion/accion.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const accionVerificacion = pgTable('accion_verificacion', {
  id: uuid('id').primaryKey().defaultRandom(),
  accionId: uuid('accion_id')
    .notNull()
    .references(() => accion.id),
  ciclo: integer('ciclo').notNull().default(1),
  verificadorId: uuid('verificador_id')
    .notNull()
    .references(() => usuario.id),
  eficaz: boolean('eficaz').notNull(),
  comentario: text('comentario'),
  nuevaFecha: date('nueva_fecha'),
  verificadoEn: timestamp('verificado_en', { withTimezone: true }).notNull().defaultNow(),
});
