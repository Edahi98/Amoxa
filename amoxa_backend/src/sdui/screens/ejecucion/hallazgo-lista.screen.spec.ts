import { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { ScreenFactory } from '@sdui-definition-screen/screen-factory.js';
import '@screens/index.js';

describe('hallazgo.lista', () => {
  it('consulta la evidencia verificada de la respuesta elegida cuando el auditor la cambia', () => {
    const screen = ScreenFactory.createById('hallazgo.lista', ScreenContextBuilder.forUser({ id: 'u1', rol: 'auditor' }));

    expect(JSON.stringify(screen.root)).toContain('"change":"consultar_evidencia"');
    expect(screen.actions['consultar_evidencia']).toMatchObject({
      type: 'call_api',
      method: 'GET',
      endpoint: '/auditorias/{entity.id}/respuestas/{data.hallazgo.respuesta_id}/evidencia-verificada',
    });
  });

  it('la regla de evidencia sigue leyendo la lista que se actualiza por respuesta', () => {
    const screen = ScreenFactory.createById('hallazgo.lista', ScreenContextBuilder.forUser({ id: 'u1', rol: 'auditor' }));
    const rule = screen.rules?.find((item) => item.id === 'NC_SIN_EVIDENCIA_VERIFICADA');

    expect(JSON.stringify(rule)).toContain('hallazgo.evidencias_verificadas');
  });

  it('el líder no recibe la consulta de evidencia (no registra hallazgos)', () => {
    const screen = ScreenFactory.createById('hallazgo.lista', ScreenContextBuilder.forUser({ id: 'u2', rol: 'lider' }));

    expect(screen.actions['consultar_evidencia']).toBeUndefined();
  });
});
