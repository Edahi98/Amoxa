import { pgTable, uuid, varchar, text, boolean } from 'drizzle-orm/pg-core';
import { auditoria } from '@schemas-auditoria/auditoria.schema.js';
import { respuestaEvidencia } from '@schemas-evidencia/respuesta-evidencia.schema.js';
import { proceso } from '@schemas-organizacion/proceso.schema.js';
import {
  tipoHallazgoEnum,
  clasificacionHallazgoEnum,
  estadoHallazgoEnum,
} from '@schemas/enums.js';

export const hallazgo = pgTable('hallazgo', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditoriaId: uuid('auditoria_id')
    .notNull()
    .references(() => auditoria.id),
  respuestaId: uuid('respuesta_id')
    .notNull()
    .references(() => respuestaEvidencia.id),
  procesoId: uuid('proceso_id')
    .notNull()
    .references(() => proceso.id),
  tipo: tipoHallazgoEnum('tipo').notNull(),
  clasificacion: clasificacionHallazgoEnum('clasificacion'),
  criterioIncumplido: varchar('criterio_incumplido', { length: 255 }),
  descripcion: text('descripcion').notNull(),
  confirmado: boolean('confirmado').notNull().default(false),
  discrepancia: text('discrepancia'),
  estado: estadoHallazgoEnum('estado').notNull().default('abierto'),
});
