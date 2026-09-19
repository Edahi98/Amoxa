import { PlanTextParser, type TeamMemberRef } from '@auditorias-parsers/plan-text-parser.js';

const MEMBERS: TeamMemberRef[] = [
  { auditorId: 'a-1', nombre: 'Ana Pérez', email: 'ana@amoxa.test' },
  { auditorId: 'a-2', nombre: 'Beto Ruiz', email: 'beto@amoxa.test' },
];

describe('PlanTextParser', () => {
  it('convierte el texto de la agenda en entradas con fecha opcional', () => {
    const entries = PlanTextParser.parseAgenda('2026-11-10 Reunión de apertura\n\nRevisión documental\n2026-13-45 Fecha inválida');

    expect(entries).toEqual([
      { fecha: '2026-11-10', actividad: 'Reunión de apertura' },
      { fecha: null, actividad: 'Revisión documental' },
      { fecha: null, actividad: '2026-13-45 Fecha inválida' },
    ]);
  });

  it('acepta la agenda como arreglo y descarta actividades vacías', () => {
    expect(PlanTextParser.parseAgenda(['Apertura', { fecha: '2026-11-11', actividad: 'Cierre' }, { actividad: '  ' }])).toEqual([
      { fecha: null, actividad: 'Apertura' },
      { fecha: '2026-11-11', actividad: 'Cierre' },
    ]);
    expect(PlanTextParser.parseAgenda(undefined)).toEqual([]);
  });

  it('asigna tareas por nombre o correo sin importar acentos ni mayúsculas', () => {
    const parsed = PlanTextParser.parseTasks('ana perez: Revisar compras\nbeto@amoxa.test: Entrevistas', MEMBERS);

    expect(parsed.unknown).toEqual([]);
    expect(parsed.tasks).toEqual([
      { auditorId: 'a-1', descripcion: 'Revisar compras' },
      { auditorId: 'a-2', descripcion: 'Entrevistas' },
    ]);
  });

  it('reporta las líneas que no corresponden a un integrante del equipo', () => {
    const parsed = PlanTextParser.parseTasks('Carlos: Algo\nsin formato', MEMBERS);

    expect(parsed.tasks).toEqual([]);
    expect(parsed.unknown).toEqual(['Carlos', 'sin formato']);
  });

  it('trata como desconocido un nombre repetido entre integrantes', () => {
    const repeated: TeamMemberRef[] = [MEMBERS[0], { ...MEMBERS[1], nombre: 'Ana Pérez' }];

    expect(PlanTextParser.parseTasks('Ana Pérez: X', repeated).unknown).toEqual(['Ana Pérez']);
  });

  it('valida los identificadores cuando las tareas llegan como arreglo', () => {
    const parsed = PlanTextParser.parseTasks(
      [
        { auditorId: 'a-1', descripcion: 'Una' },
        { auditorId: 'a-9', descripcion: 'Otra' },
      ],
      MEMBERS,
    );

    expect(parsed.tasks).toEqual([{ auditorId: 'a-1', descripcion: 'Una' }]);
    expect(parsed.unknown).toEqual(['a-9']);
  });

  it('reconstruye el texto de la agenda y de las tareas', () => {
    expect(PlanTextParser.renderAgenda([{ fecha: '2026-11-10', actividad: 'Apertura' }, { fecha: null, actividad: 'Cierre' }])).toBe(
      '2026-11-10 Apertura\nCierre',
    );
    expect(PlanTextParser.renderTasks([{ auditorId: 'a-1', descripcion: 'Revisar' }], new Map([['a-1', 'Ana Pérez']]))).toBe('Ana Pérez: Revisar');
  });
});
