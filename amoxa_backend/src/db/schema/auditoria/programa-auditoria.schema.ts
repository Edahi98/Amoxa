import { pgTable, uuid, varchar, text, date, integer } from 'drizzle-orm/pg-core';
import { organizacion } from '@schemas-organizacion/organizacion.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';
import { estadoProgramaAuditoriaEnum } from '@schemas/enums.js';

export const programaAuditoria = pgTable('programa_auditoria', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizacion.id),
  periodo: varchar('periodo', { length: 50 }).notNull(),
  objetivos: text('objetivos'),
  riesgosOportunidades: text('riesgos_oportunidades'),
  frecuencia: varchar('frecuencia', { length: 100 }),
  metodos: text('metodos'),
  aprobadoPorId: uuid('aprobado_por_id').references(() => usuario.id),
  fechaAprobacion: date('fecha_aprobacion'),
  estado: estadoProgramaAuditoriaEnum('estado').notNull().default('borrador'),
  version: integer('version').notNull().default(1),
});
