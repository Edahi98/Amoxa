import { pgTable, uuid, text, varchar, date } from 'drizzle-orm/pg-core';
import { auditoria } from '@schemas-auditoria/auditoria.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const informe = pgTable('informe', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditoriaId: uuid('auditoria_id')
    .notNull()
    .unique()
    .references(() => auditoria.id),
  conclusiones: text('conclusiones'),
  gradoConformidad: varchar('grado_conformidad', { length: 100 }),
  declaracionMuestreo: text('declaracion_muestreo'),
  fechaEmision: date('fecha_emision'),
  aceptadoPorId: uuid('aceptado_por_id').references(() => usuario.id),
});
