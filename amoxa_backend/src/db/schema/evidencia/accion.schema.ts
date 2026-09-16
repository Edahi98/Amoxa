import { pgTable, uuid, text, date } from 'drizzle-orm/pg-core';
import { hallazgo } from '@schemas-evidencia/hallazgo.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';
import { tipoAccionEnum, verificacionEficaciaEnum, estadoAccionEnum } from '@schemas/enums.js';

export const accion = pgTable('accion', {
  id: uuid('id').primaryKey().defaultRandom(),
  hallazgoId: uuid('hallazgo_id')
    .notNull()
    .references(() => hallazgo.id),
  responsableId: uuid('responsable_id')
    .notNull()
    .references(() => usuario.id),
  tipo: tipoAccionEnum('tipo').notNull(),
  causaRaiz: text('causa_raiz'),
  descripcion: text('descripcion').notNull(),
  fechaLimite: date('fecha_limite'),
  fechaCierre: date('fecha_cierre'),
  verificacionEficacia: verificacionEficaciaEnum('verificacion_eficacia')
    .notNull()
    .default('pendiente'),
  verificadoPorId: uuid('verificado_por_id').references(() => usuario.id),
  estado: estadoAccionEnum('estado').notNull().default('pendiente'),
});
