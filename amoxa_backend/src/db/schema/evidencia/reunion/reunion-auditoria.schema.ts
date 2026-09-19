import { pgTable, pgEnum, uuid, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { auditoria } from '@schemas-auditoria/auditoria.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const tipoReunionEnum = pgEnum('tipo_reunion', ['apertura', 'cierre']);

export const reunionAuditoria = pgTable(
  'reunion_auditoria',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    auditoriaId: uuid('auditoria_id')
      .notNull()
      .references(() => auditoria.id),
    tipo: tipoReunionEnum('tipo').notNull(),
    dirigidaPorId: uuid('dirigida_por_id')
      .notNull()
      .references(() => usuario.id),
    notas: text('notas'),
    realizadaEn: timestamp('realizada_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('reunion_auditoria_tipo_uq').on(table.auditoriaId, table.tipo)],
);
