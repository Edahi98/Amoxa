import type { InferSelectModel } from 'drizzle-orm';
import type { notificacion } from '@schemas/index.js';

export type NotificationRow = InferSelectModel<typeof notificacion>;

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  estado: 'nueva' | 'leída';
  tipo: string;
  entidadTipo: string | null;
  entidadId: string | null;
  creadaEn: string;
  leidaEn: string | null;
}

export interface NotificationInbox {
  notificaciones: NotificationItem[];
  sin_leer: number;
}

export class NotificationPresenter {
  public static item(row: NotificationRow): NotificationItem {
    return {
      id: row.id,
      title: row.titulo,
      description: row.mensaje,
      estado: row.leidaEn === null ? 'nueva' : 'leída',
      tipo: row.tipo,
      entidadTipo: row.entidadTipo,
      entidadId: row.entidadId,
      creadaEn: row.creadaEn.toISOString(),
      leidaEn: row.leidaEn === null ? null : row.leidaEn.toISOString(),
    };
  }

  public static inbox(rows: readonly NotificationRow[]): NotificationInbox {
    return {
      notificaciones: rows.map((row) => NotificationPresenter.item(row)),
      sin_leer: rows.filter((row) => row.leidaEn === null).length,
    };
  }
}
