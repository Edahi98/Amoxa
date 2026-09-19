import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActionCard, ActionModel } from '@molecules-audit/ActionCard.js';
import { AuditCard } from '@molecules-audit/AuditCard.js';
import { ChecklistItem } from '@molecules-audit/ChecklistItem.js';
import { EvidenceCapture } from '@molecules-audit/EvidenceCapture.js';
import { FindingCard } from '@molecules-audit/FindingCard.js';
import { GeoStamp } from '@molecules-audit/GeoStamp.js';
import { SignatureField } from '@molecules-audit/SignatureField.js';

const noop = () => undefined;

describe('molecules/audit', () => {
  it('ChecklistItem expone radiogroup de 3 resultados con icono y texto', () => {
    const html = renderToStaticMarkup(
      createElement(ChecklistItem, { id: 'c', question: '¿Se controla el documento?', clause: '7.5.3', criterion: 'norma', onValueChange: noop }),
    );
    expect(html).toContain('role="radiogroup"');
    expect(html.match(/type="radio"/g)).toHaveLength(3);
    expect(html).toContain('Conforme');
    expect(html).toContain('No conforme');
    expect(html).toContain('No aplica');
    expect(html).toContain('<article');
    expect(html).toContain('Comentario');
    expect(html).not.toContain('requiere evidencia');
  });

  it('ChecklistItem no conforme avisa que requiere evidencia y admite children y disabled', () => {
    const html = renderToStaticMarkup(
      createElement(
        ChecklistItem,
        { question: 'Q', clause: '8.5.1', value: { result: 'no_conforme', comment: 'Falta registro' }, onValueChange: noop, disabled: true },
        createElement('div', null, 'slot evidencia'),
      ),
    );
    expect(html).toContain('requiere evidencia');
    expect(html).toContain('8.5.1');
    expect(html).toContain('Falta registro');
    expect(html).toContain('slot evidencia');
    expect(html).toContain('disabled');
  });

  it('EvidenceCapture renderiza vacío, con archivos, geo requerida y deshabilitado', () => {
    const empty = renderToStaticMarkup(createElement(EvidenceCapture, { value: [], onValueChange: noop, requireGeo: true }));
    expect(empty).toContain('type="file"');
    expect(empty).toContain('Aún no hay evidencia adjunta');
    expect(empty).toContain('ubicación obligatoria');
    const full = renderToStaticMarkup(
      createElement(EvidenceCapture, {
        disabled: true,
        onValueChange: noop,
        value: [
          {
            id: '1',
            name: 'foto.jpg',
            size: 2_500_000,
            mimeType: 'image/jpeg',
            capturedAt: '2026-09-18T10:00:00Z',
            latitude: 19.4326,
            longitude: -99.1332,
            sha256: 'a'.repeat(64),
            verified: true,
          },
          { id: '2', name: 'sin-geo.pdf', size: 800, mimeType: 'application/pdf', capturedAt: '2026-09-18T10:00:00Z' },
        ],
      }),
    );
    expect(full).toContain('foto.jpg');
    expect(full).toContain('2.4 MB');
    expect(full).toContain('800 B');
    expect(full).toContain('SHA-256');
    expect(full).toContain('Verificada');
    expect(full).toContain('Sin ubicación registrada');
    expect(full).toContain('type="checkbox"');
  });

  it('SignatureField renderiza canvas con alternativa de teclado y estado firmado', () => {
    const empty = renderToStaticMarkup(createElement(SignatureField, { label: 'Firma del auditor', value: null, onValueChange: noop }));
    expect(empty).toContain('<canvas');
    expect(empty).toContain('Escribir nombre para firmar');
    expect(empty).toContain('Borrar');
    const signed = renderToStaticMarkup(
      createElement(SignatureField, {
        label: 'Firma',
        signerName: 'Ana',
        value: { dataUrl: 'data:image/png;base64,AAAA', signedAt: '2026-09-18T10:00:00Z' },
        onValueChange: noop,
        disabled: true,
      }),
    );
    expect(signed).toContain('<img');
    expect(signed).toContain('Firma de Ana');
    expect(signed).not.toContain('<canvas');
  });

  it('GeoStamp renderiza sin lectura y con lectura', () => {
    const empty = renderToStaticMarkup(createElement(GeoStamp, { value: null, onValueChange: noop }));
    expect(empty).toContain('Capturar ubicación');
    expect(empty).toContain('Sin ubicación capturada');
    const full = renderToStaticMarkup(
      createElement(GeoStamp, {
        value: { latitude: 19.4326, longitude: -99.1332, accuracy: 12, capturedAt: '2026-09-18T10:00:00Z' },
        onValueChange: noop,
      }),
    );
    expect(full).toContain('Latitud');
    expect(full).toContain('Precisión');
    expect(full).toContain('Capturar de nuevo');
  });

  it('FindingCard es article con un único botón cuando hay onPress y avisa falta de evidencia', () => {
    const html = renderToStaticMarkup(
      createElement(FindingCard, {
        title: 'Registro incompleto',
        kind: 'nc_mayor',
        clause: '8.5.1',
        process: 'Producción',
        status: 'Abierto',
        evidenceCount: 0,
        onPress: noop,
        footer: 'pie',
      }),
    );
    expect(html).toContain('<article');
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toContain('No conformidad mayor');
    expect(html).toContain('requiere evidencia');
    expect(html).toContain('Sin evidencia adjunta');
    const plain = renderToStaticMarkup(createElement(FindingCard, { title: 'T', kind: 'oportunidad', evidenceCount: 2 }));
    expect(plain).not.toContain('<button');
    expect(plain).toContain('2 evidencias adjuntas');
    const kinds = ['nc_menor', 'observacion'] as const;
    for (const kind of kinds) {
      expect(renderToStaticMarkup(createElement(FindingCard, { title: 'T', kind }))).toContain('<article');
    }
  });

  it('ActionCard muestra estado, días restantes y verificación', () => {
    const statuses = ['abierta', 'reportada', 'verificada', 'reabierta', 'vencida'] as const;
    for (const status of statuses) {
      expect(renderToStaticMarkup(createElement(ActionCard, { title: 'Corregir', status }))).toContain(ActionModel.label(status));
    }
    const html = renderToStaticMarkup(
      createElement(ActionCard, {
        title: 'Corregir',
        status: 'vencida',
        owner: 'Luis',
        dueDate: '2026-09-01',
        daysLeft: -3,
        requiresVerification: true,
        onPress: noop,
      }),
    );
    expect(html).toContain('Vencida hace 3 días');
    expect(html).toContain('Luis');
    expect(html).toContain('verificación de eficacia');
    expect(ActionModel.daysText(0)).toBe('Vence hoy');
    expect(ActionModel.daysText(1)).toBe('Vence en 1 día');
  });

  it('AuditCard muestra método, fechas y líder', () => {
    const html = renderToStaticMarkup(
      createElement(AuditCard, {
        title: 'Auditoría de proceso de compras',
        scope: 'Compras',
        method: 'remoto',
        startDate: '2026-10-01',
        endDate: '2026-10-03',
        status: 'Planeada',
        leader: 'Ana Pérez',
        onPress: noop,
      }),
    );
    expect(html).toContain('Remoto');
    expect(html).toContain('Ana Pérez');
    expect(html).toContain('Planeada');
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(renderToStaticMarkup(createElement(AuditCard, { title: 'Mínima' }))).toContain('<article');
  });
});
