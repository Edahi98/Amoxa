import { PGlite } from '@electric-sql/pglite';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { pushSchema } from 'drizzle-kit/api';
import * as schema from '@db/schema/index.js';
import type { Db } from '@db/client.js';

export class TestDatabase {
  public readonly client: PGlite;
  public readonly orm: PgliteDatabase<typeof schema>;

  private constructor(client: PGlite, orm: PgliteDatabase<typeof schema>) {
    this.client = client;
    this.orm = orm;
  }

  public static async create(): Promise<TestDatabase> {
    const client = new PGlite();
    const orm = drizzle(client, { schema });
    const { apply } = await pushSchema(schema as unknown as Record<string, unknown>, orm as never);
    await apply();
    return new TestDatabase(client, orm);
  }

  public get db(): Db {
    return this.orm as unknown as Db;
  }

  public async close(): Promise<void> {
    await this.client.close();
  }
}
