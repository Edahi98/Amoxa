import { pgTable, uuid, text, date } from 'drizzle-orm/pg-core';
import { usuario } from '@schemas-organizacion/usuario.schema.js';
import { estadoAuditorEnum } from '@schemas/enums.js';

export const auditor = pgTable('auditor', {
  usuarioId: uuid('usuario_id')
    .primaryKey()
    .references(() => usuario.id),
  disciplinas: text('disciplinas').array(),
  formacion: text('formacion'),
  experiencia: text('experiencia'),
  estado: estadoAuditorEnum('estado').notNull(),
  vigenciaHasta: date('vigencia_hasta'),
});
