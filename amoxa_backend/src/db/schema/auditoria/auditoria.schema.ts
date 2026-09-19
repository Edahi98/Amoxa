import { pgTable, uuid, text, date, boolean } from 'drizzle-orm/pg-core';
import { programaAuditoria } from '@schemas-programa/programa-auditoria.schema.js';
import { plantillaChecklist } from '@schemas-plantilla/plantilla-checklist.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';
import { metodoAuditoriaEnum, estadoAuditoriaEnum } from '@schemas/enums.js';

export const auditoria = pgTable('auditoria', {
  id: uuid('id').primaryKey().defaultRandom(),
  programaId: uuid('programa_id')
    .notNull()
    .references(() => programaAuditoria.id),
  plantillaId: uuid('plantilla_id')
    .notNull()
    .references(() => plantillaChecklist.id),
  liderId: uuid('lider_id')
    .notNull()
    .references(() => usuario.id),
  objetivos: text('objetivos'),
  criterios: text('criterios').array(),
  metodo: metodoAuditoriaEnum('metodo').notNull(),
  fechaPlan: date('fecha_plan'),
  fechaReal: date('fecha_real'),
  viabilidadOk: boolean('viabilidad_ok').notNull().default(false),
  planAprobado: boolean('plan_aprobado').notNull().default(false),
  estado: estadoAuditoriaEnum('estado').notNull().default('planificada'),
});
