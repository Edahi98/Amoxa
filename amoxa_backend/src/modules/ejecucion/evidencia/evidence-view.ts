import type { adjunto } from '@schemas/index.js';

export type AdjuntoRow = typeof adjunto.$inferSelect;

export interface EvidenceView {
  id: string;
  adjuntoId: string;
  name: string;
  size: number;
  mimeType: string;
  capturedAt: string;
  latitude?: number;
  longitude?: number;
  sha256: string | null;
  almacenado: boolean;
  verified: boolean;
}

export class EvidenceViewMapper {
  public static from(row: AdjuntoRow, verified: boolean): EvidenceView {
    return {
      id: row.clienteId ?? row.id,
      adjuntoId: row.id,
      name: row.nombreOriginal ?? 'archivo',
      size: row.tamanoBytes ?? 0,
      mimeType: row.mime ?? 'application/octet-stream',
      capturedAt: row.capturadoEn.toISOString(),
      ...(row.geo === null ? {} : { latitude: row.geo.y, longitude: row.geo.x }),
      sha256: row.hash,
      almacenado: row.almacenado,
      verified,
    };
  }
}
