import { pgTable, pgEnum, uuid, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { reunionAuditoria } from '@schemas-reunion/reunion-auditoria.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const rolAsistenciaEnum = pgEnum('rol_asistencia_reunion', ['preside', 'asiste']);

export const asistenciaReunion = pgTable(
  'asistencia_reunion',
  {
    reunionId: uuid('reunion_id')
      .notNull()
      .references(() => reunionAuditoria.id),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuario.id),
    rol: rolAsistenciaEnum('rol').notNull().default('asiste'),
    registradaPorId: uuid('registrada_por_id')
      .notNull()
      .references(() => usuario.id),
    confirmadaEn: timestamp('confirmada_en', { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.reunionId, table.usuarioId] })],
);
