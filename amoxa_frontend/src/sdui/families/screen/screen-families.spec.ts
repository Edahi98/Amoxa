import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScreenFamilyRegistry } from '@sdui-families-screen/screen-family-registry';
import { SCREEN_FAMILY_KEYS } from '@sdui-families-screen/screen-family';
import { ScreenTemplateRegistry } from '@sdui-react-template/screen-template-registry';

const SERVER_SCREENS = [
  'acceso.login', 'inicio', 'notificaciones',
  'programa.lista', 'programa.editar', 'programa.aprobar',
  'plantilla.lista', 'plantilla.editar', 'plantilla.publicar',
  'auditor.lista', 'auditor.ficha', 'auditor.evaluacion',
  'dashboard.programa', 'revision.direccion', 'revision.programa',
  'registro.buscar', 'registro.historial',
  'auditoria.lista', 'auditoria.alcance', 'auditoria.contacto', 'auditoria.equipo', 'auditoria.plan', 'auditoria.plan_aprobar',
  'ejecucion.apertura', 'ejecucion.checklist', 'hallazgo.lista', 'ejecucion.evidencia', 'ejecucion.cierre',
  'informe.vista_previa', 'informe.distribuir', 'informe.ver',
  'accion.lista', 'accion.crear', 'accion.cierre', 'accion.verificar',
];

describe('ScreenFamilyRegistry', () => {
  it('asigna cada pantalla del servidor a una familia conocida', () => {
    expect(SERVER_SCREENS).toHaveLength(35);
    for (const screenId of SERVER_SCREENS) {
      expect(ScreenFamilyRegistry.isKnown(screenId), screenId).toBe(true);
    }
  });

  it('no repite pantallas entre familias', () => {
    const all = ScreenFamilyRegistry.all().flatMap((family) => family.screens);
    expect(new Set(all).size).toBe(all.length);
  });

  it('cada etapa pertenece a las pantallas de su familia', () => {
    for (const family of ScreenFamilyRegistry.all()) {
      for (const stage of family.stages) {
        expect(family.screens, `${family.key}:${stage.id}`).toContain(stage.id);
      }
    }
  });

  it('tiene una familia y un template por cada clave', () => {
    const keys = ScreenFamilyRegistry.all().map((family) => family.key);
    expect([...keys].sort()).toEqual([...SCREEN_FAMILY_KEYS].sort());
    for (const key of SCREEN_FAMILY_KEYS) {
      expect(typeof ScreenTemplateRegistry.templateFor(key)).toBe('function');
    }
  });

  it('una pantalla desconocida cae en la familia de inicio', () => {
    expect(ScreenFamilyRegistry.forScreen('no.existe').key).toBe('home');
  });
});

describe('templates por familia', () => {
  it('cada template renderiza h1, el cuerpo y su marca de familia', () => {
    for (const family of ScreenFamilyRegistry.all()) {
      const Template = ScreenTemplateRegistry.templateFor(family.key);
      const current = family.screens[0];
      const html = renderToStaticMarkup(
        createElement(
          Template,
          {
            title: 'Título',
            subtitle: 'Subtítulo',
            familyTitle: family.title,
            clause: family.clause,
            stages: family.stages,
            currentStageId: current,
            banners: createElement('p', null, 'Aviso'),
            children: null,
          },
          createElement('p', null, 'Cuerpo'),
        ),
      );
      expect(html, family.key).toContain(`data-template="${family.key}"`);
      expect(html).toMatch(/<h1[^>]*>Título<\/h1>/);
      expect(html).toContain('Cuerpo');
      expect(html).toContain('Aviso');
    }
  });

  it('las familias con etapas muestran el paso actual accesible y las demás no', () => {
    for (const family of ScreenFamilyRegistry.all()) {
      const Template = ScreenTemplateRegistry.templateFor(family.key);
      const html = renderToStaticMarkup(
        createElement(
          Template,
          {
            title: 'T',
            familyTitle: family.title,
            stages: family.stages,
            currentStageId: family.stages[0]?.id ?? family.screens[0],
            children: null,
          },
          null,
        ),
      );
      if (family.stages.length > 0) {
        expect(html, family.key).toContain('aria-current="step"');
        expect(html).toContain(`Paso 1 de ${family.stages.length}`);
      } else {
        expect(html, family.key).not.toContain('aria-current="step"');
      }
    }
  });

  it('ejecución fija las etapas y el informe usa superficie de documento', () => {
    const props = { title: 'T', familyTitle: 'F', stages: [{ id: 'a', label: 'A' }], currentStageId: 'a', children: null };
    const ejecucion = renderToStaticMarkup(createElement(ScreenTemplateRegistry.templateFor('ejecucion'), props, null));
    const informe = renderToStaticMarkup(createElement(ScreenTemplateRegistry.templateFor('informe'), props, null));

    expect(ejecucion).toContain('sticky');
    expect(informe).toContain('<article');
  });
});
