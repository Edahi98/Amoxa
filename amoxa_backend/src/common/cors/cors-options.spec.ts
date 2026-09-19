import { CorsOptions } from '@common-cors/cors-options.js';

describe('CorsOptions', () => {
  it('expone Content-Disposition para que el navegador pueda leer el nombre y detectar las descargas', () => {
    expect(CorsOptions.build('http://localhost:5173').exposedHeaders).toContain('Content-Disposition');
  });

  it('usa el origen indicado o el del frontend de desarrollo por defecto', () => {
    expect(CorsOptions.build('https://app.amoxa.test').origin).toBe('https://app.amoxa.test');
    expect(CorsOptions.build(undefined).origin).toBe('http://localhost:5173');
  });
});
