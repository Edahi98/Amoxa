import { EvidenceFindingState } from '@ejecucion-evidencia/evidence-finding-state.js';

describe('EvidenceFindingState', () => {
  it('entrega solo la respuesta elegida cuando tiene evidencia verificada', () => {
    expect(EvidenceFindingState.from({ respuestaId: 'r-1', verificada: true, archivos: 2 })).toEqual({
      'hallazgo.evidencias_verificadas': ['r-1'],
    });
  });

  it('entrega una lista vacía cuando la respuesta elegida no está verificada', () => {
    expect(EvidenceFindingState.from({ respuestaId: 'r-1', verificada: false, archivos: 1 })).toEqual({
      'hallazgo.evidencias_verificadas': [],
    });
  });
});
