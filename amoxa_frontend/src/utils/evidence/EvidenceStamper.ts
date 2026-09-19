import type { EvidenceItem } from '@utils-evidence/EvidenceItem.js';
import { GeoLocator, type GeoFailure } from '@utils-evidence/GeoLocator.js';
import { Sha256Hasher } from '@utils-evidence/Sha256Hasher.js';

export type StampResult = { ok: true; item: EvidenceItem } | { ok: false; reason: GeoFailure };

export class EvidenceStamper {
  public static newId(): string {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    return `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  public static async stamp(file: File, requireGeo: boolean): Promise<StampResult> {
    const [hash, geo] = await Promise.all([Sha256Hasher.hashFile(file), GeoLocator.current()]);
    if (!geo.ok && requireGeo) {
      return { ok: false, reason: geo.reason };
    }
    const item: EvidenceItem = {
      id: EvidenceStamper.newId(),
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      capturedAt: new Date().toISOString(),
      sha256: hash,
      verified: false,
    };
    if (geo.ok) {
      item.latitude = geo.reading.latitude;
      item.longitude = geo.reading.longitude;
    }
    return { ok: true, item };
  }
}
