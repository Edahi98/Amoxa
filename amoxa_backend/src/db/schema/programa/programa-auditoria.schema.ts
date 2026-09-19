import { pgTable, uuid, varchar, text, date, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
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
  fechaInicio: date('fecha_inicio'),
  fechaFin: date('fecha_fin'),
  prioridadModificada: boolean('prioridad_modificada').notNull().default(false),
  justificacionPrioridad: text('justificacion_prioridad'),
  motivoDevolucion: text('motivo_devolucion'),
  creadoPorId: uuid('creado_por_id').references(() => usuario.id),
  enviadoEn: timestamp('enviado_en', { withTimezone: true }),
  aprobadoPorId: uuid('aprobado_por_id').references(() => usuario.id),
  fechaAprobacion: date('fecha_aprobacion'),
  aprobadoEn: timestamp('aprobado_en', { withTimezone: true }),
  estado: estadoProgramaAuditoriaEnum('estado').notNull().default('borrador'),
  version: integer('version').notNull().default(1),
});
