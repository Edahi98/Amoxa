import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id').references(() => usuario.id),
    action: varchar('action', { length: 100 }).notNull(),
    targetId: uuid('target_id').references(() => usuario.id),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    ip: varchar('ip', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('audit_log_target_idx').on(table.targetId), index('audit_log_actor_idx').on(table.actorId)],
);
