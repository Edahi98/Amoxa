import { pgTable, uuid, boolean, primaryKey, timestamp } from 'drizzle-orm/pg-core';
import { auditoria } from '@schemas-auditoria/auditoria.schema.js';
import { auditor } from '@schemas-auditor/auditor.schema.js';
import { rolEquipoAuditoriaEnum } from '@schemas/enums.js';

export const equipoAuditoria = pgTable(
  'equipo_auditoria',
  {
    auditoriaId: uuid('auditoria_id')
      .notNull()
      .references(() => auditoria.id),
    auditorId: uuid('auditor_id')
      .notNull()
      .references(() => auditor.usuarioId),
    rol: rolEquipoAuditoriaEnum('rol').notNull(),
    imparcialidadOk: boolean('imparcialidad_ok').notNull().default(false),
    retiradoEn: timestamp('retirado_en', { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.auditoriaId, table.auditorId] })],
);
