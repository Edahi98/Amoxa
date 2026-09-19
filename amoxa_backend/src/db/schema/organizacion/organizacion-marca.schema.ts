import { customType, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { organizacion } from '@schemas-organizacion/organizacion.schema.js';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const organizacionMarca = pgTable('organizacion_marca', {
  organizacionId: uuid('organizacion_id')
    .primaryKey()
    .references(() => organizacion.id),
  color: varchar('color', { length: 7 }),
  pie: varchar('pie', { length: 200 }),
  logo: bytea('logo'),
  logoTipo: varchar('logo_tipo', { length: 10 }),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
});
