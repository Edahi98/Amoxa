import { boolean, char, check, pgTable, smallint } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const systemState = pgTable(
  'system_state',
  {
    id: smallint('id').primaryKey().default(1),
    initialized: boolean('initialized').notNull().default(false),
    setupTokenHash: char('setup_token_hash', { length: 64 }),
  },
  (table) => [check('system_state_single_row', sql`${table.id} = 1`)],
);
