import { pgTable, uuid, char, timestamp, boolean } from 'drizzle-orm/pg-core';
import { usuario } from '@schemas-organizacion/usuario.schema.js';

export const token = pgTable('token', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuario.id),
  tokenHash: char('token_hash', { length: 64 }).notNull().unique(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revoked: boolean('revoked').notNull().default(false),
});
