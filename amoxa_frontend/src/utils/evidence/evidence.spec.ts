import { EvidenceStamper } from '@utils-evidence/EvidenceStamper.js';
import { GeoLocator } from '@utils-evidence/GeoLocator.js';
import { Sha256Hasher } from '@utils-evidence/Sha256Hasher.js';
import { SignatureRenderer } from '@utils-evidence/SignatureRenderer.js';

describe('Sha256Hasher', () => {
  it('calcula el SHA-256 conocido de un texto', async () => {
    expect(await Sha256Hasher.hashText('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(await Sha256Hasher.hashText('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('calcula el hash de un Blob y acorta huellas', async () => {
    expect(await Sha256Hasher.hashFile(new Blob(['abc']))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(Sha256Hasher.shorten('a'.repeat(64))).toBe(`${'a'.repeat(8)}…${'a'.repeat(8)}`);
    expect(Sha256Hasher.shorten('abc')).toBe('abc');
    expect(Sha256Hasher.toHex(new Uint8Array([0, 15, 255]).buffer)).toBe('000fff');
  });
});

describe('GeoLocator', () => {
  it('traduce códigos de error de geolocalización', () => {
    expect(GeoLocator.reasonFromCode(1)).toBe('denied');
    expect(GeoLocator.reasonFromCode(2)).toBe('unavailable');
    expect(GeoLocator.reasonFromCode(3)).toBe('timeout');
    expect(GeoLocator.describe('denied')).toContain('denegado');
  });

  it('informa no soportado cuando no hay navigator.geolocation', async () => {
    const result = await GeoLocator.current();
    expect(result).toEqual({ ok: false, reason: 'unsupported' });
  });
});

describe('EvidenceStamper', () => {
  it('genera ids únicos', () => {
    expect(EvidenceStamper.newId()).not.toBe(EvidenceStamper.newId());
  });

  it('sella con huella y sin ubicación cuando no es obligatoria', async () => {
    const file = new File(['abc'], 'nota.txt', { type: 'text/plain' });
    const result = await EvidenceStamper.stamp(file, false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.item.name).toBe('nota.txt');
      expect(result.item.size).toBe(3);
      expect(result.item.sha256).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
      expect(result.item.latitude).toBeUndefined();
      expect(result.item.verified).toBe(false);
    }
  });

  it('rechaza el archivo cuando la ubicación es obligatoria y falla', async () => {
    const file = new File(['abc'], 'nota.txt');
    const result = await EvidenceStamper.stamp(file, true);
    expect(result).toEqual({ ok: false, reason: 'unsupported' });
  });
});

describe('SignatureRenderer', () => {
  it('no genera firma con nombre vacío ni sin DOM', () => {
    expect(SignatureRenderer.isBlank('   ')).toBe(true);
    expect(SignatureRenderer.fromText('   ', 'black')).toBeNull();
    expect(SignatureRenderer.fromText('Ana', 'black')).toBeNull();
  });
});
