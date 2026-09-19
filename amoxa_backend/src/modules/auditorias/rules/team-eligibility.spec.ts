import { TeamEligibility, type TeamCandidate } from '@auditorias-rules/team-eligibility.js';

const TODAY = '2026-06-01';

const candidate = (overrides: Partial<TeamCandidate> = {}): TeamCandidate => ({
  usuarioId: 'a-1',
  nombre: 'Ana Auditora',
  procesoId: 'p-ventas',
  estado: 'apto',
  vigenciaHasta: '2027-01-01',
  ...overrides,
});

describe('TeamEligibility', () => {
  it('acepta a un auditor apto, vigente y de otra área', () => {
    expect(TeamEligibility.evaluate(candidate(), ['p-compras'], TODAY)).toEqual({ eligible: true });
  });

  it('bloquea a quien audita su propia área e indica el motivo', () => {
    const verdict = TeamEligibility.evaluate(candidate({ procesoId: 'p-compras' }), ['p-compras'], TODAY);

    expect(verdict.eligible).toBe(false);
    expect(verdict.reason).toContain('propia área');
  });

  it('bloquea al auditor no apto', () => {
    const verdict = TeamEligibility.evaluate(candidate({ estado: 'no_apto' }), [], TODAY);

    expect(verdict.eligible).toBe(false);
    expect(verdict.reason).toContain('no apto');
  });

  it('bloquea la competencia vencida y acepta la que vence hoy o sin vigencia', () => {
    expect(TeamEligibility.evaluate(candidate({ vigenciaHasta: '2026-05-31' }), [], TODAY).reason).toContain('vencida');
    expect(TeamEligibility.evaluate(candidate({ vigenciaHasta: TODAY }), [], TODAY).eligible).toBe(true);
    expect(TeamEligibility.evaluate(candidate({ vigenciaHasta: null }), [], TODAY).eligible).toBe(true);
  });

  it('un auditor sin proceso propio no tiene conflicto de área', () => {
    expect(TeamEligibility.evaluate(candidate({ procesoId: null }), ['p-compras'], TODAY).eligible).toBe(true);
  });

  it('lista los conflictos de una selección incluyendo a quien no es auditor registrado', () => {
    const candidates = new Map([
      ['a-1', candidate()],
      ['a-2', candidate({ usuarioId: 'a-2', nombre: 'Beto', procesoId: 'p-compras' })],
    ]);

    const conflicts = TeamEligibility.conflicts(['a-1', 'a-2', 'a-3', 'a-2'], candidates, ['p-compras'], TODAY);

    expect(conflicts.map((item) => item.auditorId)).toEqual(['a-2', 'a-3']);
    expect(conflicts[1].motivo).toContain('registrado');
  });

  it('asigna el rol de formación a quien está en formación', () => {
    expect(TeamEligibility.roleFor(candidate({ estado: 'formacion' }))).toBe('formacion');
    expect(TeamEligibility.roleFor(candidate())).toBe('auditor');
  });
});
