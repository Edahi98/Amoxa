export interface GeoReading {
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt: string;
}

export type GeoFailure = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

export type GeoResult = { ok: true; reading: GeoReading } | { ok: false; reason: GeoFailure };

export class GeoLocator {
  private static readonly MESSAGES: Record<GeoFailure, string> = {
    denied: 'Permiso de ubicación denegado. Habilítalo en el navegador para continuar.',
    unavailable: 'No se pudo determinar la ubicación en este dispositivo.',
    timeout: 'La ubicación tardó demasiado en responder. Intenta de nuevo.',
    unsupported: 'Este navegador no ofrece geolocalización.',
  };

  public static describe(reason: GeoFailure): string {
    return GeoLocator.MESSAGES[reason];
  }

  public static reasonFromCode(code: number): GeoFailure {
    if (code === 1) {
      return 'denied';
    }
    if (code === 3) {
      return 'timeout';
    }
    return 'unavailable';
  }

  public static current(timeoutMs: number = 10_000): Promise<GeoResult> {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        resolve({ ok: false, reason: 'unsupported' });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            ok: true,
            reading: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              capturedAt: new Date().toISOString(),
            },
          }),
        (error) => resolve({ ok: false, reason: GeoLocator.reasonFromCode(error.code) }),
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
      );
    });
  }
}
