import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { auditoria } from '@schemas-auditoria/auditoria.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const revisionAlcance = pgTable('revision_alcance', {
  auditoriaId: uuid('auditoria_id')
    .primaryKey()
    .references(() => auditoria.id),
  revisadoPorId: uuid('revisado_por_id').references(() => usuario.id),
  revisadoEn: timestamp('revisado_en', { withTimezone: true }),
  comentario: text('comentario'),
});
