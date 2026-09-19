import { DistributionRules } from '@informes-rules/distribution-rules.js';
import { InformeAccess } from '@informes-rules-informe/informe-access.js';
import { InformeContentBuilder } from '@informes-rules-informe/informe-content-builder.js';
import type { InformeDetalle } from '@informes-rules-informe/informe-detalle.types.js';
import { InformeFingerprint } from '@informes-rules-informe/informe-fingerprint.js';
import { InformeState } from '@informes-rules-informe/informe-state.js';
import { InformeTransitions } from '@informes-rules-informe/informe-transitions.js';
import type { HallazgoResumen, InformeContentInput } from '@informes-rules-informe/informe.types.js';

const NC: HallazgoResumen = { id: 'h1', tipo: 'NC', clasificacion: 'mayor', criterio: '8.4', descripcion: 'Falta evaluación', estado: 'abierto', proceso: 'Compras' };
const OM: HallazgoResumen = { id: 'h2', tipo: 'OM', clasificacion: null, criterio: null, descripcion: 'Digitalizar', estado: 'abierto', proceso: 'Compras' };

const CONTENT: InformeContentInput = {
  objetivos: 'Objetivo',
  criterios: ['9001'],
  procesos: ['Compras'],
  equipo: ['Ana:auditor'],
  hallazgos: [NC, OM],
  fechaPlan: null,
  fechaReal: null,
  conclusiones: 'Conclusión',
};

describe('reglas puras de informes', () => {
  it('resuelve el estado del informe', () => {
    expect(InformeState.resolve(false, false)).toBe('borrador');
    expect(InformeState.resolve(true, false)).toBe('firmado');
    expect(InformeState.resolve(true, true)).toBe('distribuido');
  });

  it('solo permite editar y firmar en borrador, y distribuir cuando está firmado', () => {
    expect(() => InformeTransitions.assertCanEditConclusions('borrador')).not.toThrow();
    expect(() => InformeTransitions.assertCanEditConclusions('firmado')).toThrow();
    expect(() => InformeTransitions.assertCanSign('borrador', 'texto')).not.toThrow();
    expect(() => InformeTransitions.assertCanSign('borrador', '  ')).toThrow();
    expect(() => InformeTransitions.assertCanSign('firmado', 'texto')).toThrow();
    expect(() => InformeTransitions.assertCanDistribute('firmado')).not.toThrow();
    expect(() => InformeTransitions.assertCanDistribute('borrador')).toThrow();
    expect(() => InformeTransitions.assertCanDistribute('distribuido')).toThrow();
    expect(() => InformeTransitions.assertCanApprove('borrador')).toThrow();
    expect(() => InformeTransitions.assertCanApprove('firmado')).not.toThrow();
  });

  it('exige un destinatario de dirección', () => {
    expect(() => DistributionRules.assertValid([])).toThrow();
    expect(() => DistributionRules.assertValid([{ id: 'a', rol: 'auditado' }])).toThrow(/alta dirección/);
    expect(() => DistributionRules.assertValid([{ id: 'a', rol: 'auditado' }, { id: 'b', rol: 'admin' }])).not.toThrow();
    expect(DistributionRules.includesDirection([{ id: 'a', rol: 'gestor_programa' }])).toBe(false);
  });

  it('la huella cambia si cambia el contenido y no depende del orden de las claves', () => {
    const base = InformeFingerprint.compute(CONTENT);
    expect(InformeFingerprint.compute({ ...CONTENT })).toBe(base);
    expect(InformeFingerprint.compute({ ...CONTENT, conclusiones: 'Otra' })).not.toBe(base);
  });

  it('arma resumen, grado de conformidad y texto de hallazgos', () => {
    expect(InformeContentBuilder.conformity([NC, OM])).toContain('50%');
    expect(InformeContentBuilder.conformity([])).toContain('Sin hallazgos');
    expect(InformeContentBuilder.summary(['Compras'], [NC, OM])).toContain('1 no conformidad(es) mayor(es)');
    expect(InformeContentBuilder.findingsText([NC])).toContain('cláusula 8.4');
    expect(InformeContentBuilder.suggestedConclusions([OM])).toContain('no se detectaron');
  });

  it('controla quién lee el informe', () => {
    const detail = {
      estado: 'distribuido',
      liderId: 'lider',
      procesoIds: ['p1'],
      distribucion: [{ usuarioId: 'du-recipient' }],
    } as unknown as InformeDetalle;
    const borrador = { ...detail, estado: 'borrador' } as InformeDetalle;

    expect(InformeAccess.canRead(detail, { userId: 'x', role: 'direccion', processIds: [] })).toBe(true);
    expect(InformeAccess.canRead(borrador, { userId: 'x', role: 'direccion', processIds: [] })).toBe(false);
    expect(InformeAccess.canRead(borrador, { userId: 'lider', role: 'lider', processIds: [] })).toBe(true);
    expect(InformeAccess.canRead(borrador, { userId: 'otro', role: 'lider', processIds: [] })).toBe(false);
    expect(InformeAccess.canRead(borrador, { userId: 'g', role: 'gestor', processIds: [] })).toBe(true);
    expect(InformeAccess.canRead(detail, { userId: 'du-recipient', role: 'dueno_proceso', processIds: [] })).toBe(true);
    expect(InformeAccess.canRead(detail, { userId: 'du', role: 'dueno_proceso', processIds: ['p1'] })).toBe(true);
    expect(InformeAccess.canRead(detail, { userId: 'du', role: 'dueno_proceso', processIds: ['p2'] })).toBe(false);
    expect(InformeAccess.canRead(detail, { userId: 'a', role: 'auditor', processIds: [] })).toBe(false);
    expect(InformeAccess.canAcknowledge(detail, { userId: 'x', role: 'direccion', processIds: [] })).toBe(true);
    expect(InformeAccess.canAcknowledge(detail, { userId: 'du', role: 'dueno_proceso', processIds: ['p1'] })).toBe(false);
  });
});
