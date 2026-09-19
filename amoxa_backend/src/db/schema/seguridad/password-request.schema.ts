import { char, index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { usuario } from '@schemas-organizacion/usuario.schema.js';
import { passwordRequestStatusEnum, passwordRequestTypeEnum } from '@schemas/enums.js';

export const passwordRequest = pgTable(
  'password_request',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuario.id),
    type: passwordRequestTypeEnum('type').notNull(),
    status: passwordRequestStatusEnum('status').notNull().default('pending'),
    tokenHash: char('token_hash', { length: 64 }).unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    requestedIp: varchar('requested_ip', { length: 64 }),
    handledBy: uuid('handled_by').references(() => usuario.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    handledAt: timestamp('handled_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('password_request_one_pending_per_usuario')
      .on(table.usuarioId)
      .where(sql`${table.status} = 'pending'`),
    index('password_request_status_idx').on(table.status),
  ],
);
