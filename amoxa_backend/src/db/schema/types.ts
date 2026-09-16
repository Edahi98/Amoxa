import { customType } from 'drizzle-orm/pg-core';

export interface GeoPoint {
  x: number;
  y: number;
}

export const point = customType<{ data: GeoPoint; driverData: string }>({
  dataType() {
    return 'point';
  },
  toDriver(value) {
    return `(${value.x},${value.y})`;
  },
  fromDriver(value) {
    const [x, y] = value.replace(/[()]/g, '').split(',').map(Number);
    return { x, y };
  },
});
