import { EvidenceDirectory } from '@ejecucion-evidencia/evidence-directory.js';
import { EvidencePolicy } from '@ejecucion-evidencia/evidence-policy.js';
import { FileDigest } from '@ejecucion-evidencia-file/file-digest.js';
import { FileSignature } from '@ejecucion-evidencia-file/file-signature.js';
import { EvidenceFixtures } from '@testing-ejecucion/evidence-fixtures.js';

describe('EvidencePolicy', () => {
  it('sanea nombres de archivo y evita recorridos de ruta', () => {
    expect(EvidencePolicy.sanitizeName('../../etc/passwd')).toBe('passwd');
    expect(EvidencePolicy.sanitizeName('..\\..\\windows\\system32\\evil.exe')).toBe('evil.exe');
    expect(EvidencePolicy.sanitizeName('Foto de auditoría #1.PNG')).toBe('Foto-de-auditoria-1.PNG');
    expect(EvidencePolicy.sanitizeName('...')).toBe('archivo');
    expect(EvidencePolicy.sanitizeName('.htaccess')).toBe('htaccess');
    expect(EvidencePolicy.sanitizeName(`${'a'.repeat(300)}.pdf`).length).toBeLessThanOrEqual(100);
    expect(EvidencePolicy.sanitizeName(`${'a'.repeat(300)}.pdf`).endsWith('.pdf')).toBe(true);
  });

  it('aplica la lista blanca de tipos y el tamaño máximo', () => {
    expect(EvidencePolicy.mimeViolation('image/png')).toBeUndefined();
    expect(EvidencePolicy.mimeViolation('application/x-msdownload')).toBeDefined();
    expect(EvidencePolicy.mimeViolation('text/html')).toBeDefined();
    expect(EvidencePolicy.sizeViolation(0)).toBeDefined();
    expect(EvidencePolicy.sizeViolation(EvidencePolicy.MAX_BYTES + 1)).toBeDefined();
    expect(EvidencePolicy.sizeViolation(1024)).toBeUndefined();
  });

  it('clasifica el tipo de adjunto', () => {
    expect(EvidencePolicy.typeFor('image/jpeg')).toBe('foto');
    expect(EvidencePolicy.typeFor('image/png', 'captura')).toBe('captura');
    expect(EvidencePolicy.typeFor('application/pdf', 'captura')).toBe('doc');
    expect(EvidencePolicy.typeFor('video/mp4')).toBe('video');
  });
});

describe('FileSignature', () => {
  it('valida el contenido contra el tipo declarado', () => {
    expect(FileSignature.matches('image/png', EvidenceFixtures.png())).toBe(true);
    expect(FileSignature.matches('application/pdf', EvidenceFixtures.pdf())).toBe(true);
    expect(FileSignature.matches('image/png', EvidenceFixtures.pdf())).toBe(false);
    expect(FileSignature.matches('image/jpeg', Buffer.from('<script>alert(1)</script>'))).toBe(false);
    expect(FileSignature.matches('text/plain', Buffer.from([0x41, 0x00, 0x42]))).toBe(false);
  });
});

describe('FileDigest y EvidenceDirectory', () => {
  it('calcula SHA-256 en hexadecimal', () => {
    expect(FileDigest.sha256(Buffer.from('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('usa el directorio configurado o el predeterminado', () => {
    expect(EvidenceDirectory.resolve('   ').replaceAll('\\', '/')).toMatch(/storage\/evidencias$/);
    expect(EvidenceDirectory.resolve('/tmp/x').replaceAll('\\', '/')).toMatch(/tmp\/x$/);
  });
});
