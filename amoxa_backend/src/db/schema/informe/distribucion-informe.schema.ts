import { pgTable, uuid, timestamp, boolean, primaryKey } from 'drizzle-orm/pg-core';
import { informe } from '@schemas-informe/informe.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const distribucionInforme = pgTable(
  'distribucion_informe',
  {
    informeId: uuid('informe_id')
      .notNull()
      .references(() => informe.id),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuario.id),
    fechaEnvio: timestamp('fecha_envio', { withTimezone: true }).notNull().defaultNow(),
    leido: boolean('leido').notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.informeId, table.usuarioId] })],
);
