import type { SessionRole } from '@shared/roles.js';

export interface WorkflowStep {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly roles: readonly SessionRole[];
  readonly tasks: readonly string[];
  readonly rules: readonly string[];
  readonly screens: readonly string[];
  readonly clause: string;
}

export interface WorkflowDefinition {
  readonly title: string;
  readonly summary: string;
  readonly steps: readonly WorkflowStep[];
}

export const WORKFLOWS = {
  'ciclo-auditoria': {
    title: 'Ciclo de una auditoría',
    summary:
      'Del diseño de la lista de verificación al análisis de resultados: cómo se prepara, se ejecuta, se informa y se le da seguimiento a una auditoría interna.',
    steps: [
      {
        id: 'plantillas',
        title: 'Creación y preparación de plantillas',
        summary:
          'Se diseñan las listas de verificación de la auditoría. Se puede partir de una plantilla vigente o crear una nueva.',
        roles: ['gestor', 'lider'],
        tasks: [
          'Abra Plantillas y revise las vigentes antes de crear una nueva.',
          'Cree la plantilla o edite una existente: cada pregunta lleva su cláusula y el tipo de criterio.',
          'El líder puede proponer preguntas; el gestor las revisa.',
          'Publique una versión cuando la plantilla cubra ISO 9001 y los requisitos propios.',
        ],
        rules: ['Una plantilla solo es vigente si tiene preguntas de ISO 9001 y de requisitos propios.'],
        screens: ['plantilla.lista', 'plantilla.editar', 'plantilla.publicar'],
        clause: '9.2.1 a',
      },
      {
        id: 'ejecucion',
        title: 'Ejecución de la inspección en campo',
        summary:
          'El equipo auditor realiza la revisión desde la aplicación, con o sin conexión, y captura la evidencia en el momento.',
        roles: ['lider', 'auditor'],
        tasks: [
          'Abra la auditoría y realice la reunión de apertura con el área.',
          'Responda el checklist. Funciona sin conexión y se sincroniza al recuperar la red.',
          'Capture evidencia directamente en la aplicación: fotos o documentos con fecha y ubicación.',
          'Registre cada no conformidad con su cláusula incumplida y su evidencia.',
          'Cierre con la reunión de cierre y registre las discrepancias.',
        ],
        rules: ['Una no conformidad sin evidencia verificada no se guarda.'],
        screens: ['ejecucion.apertura', 'ejecucion.checklist', 'ejecucion.evidencia', 'hallazgo.lista', 'ejecucion.cierre'],
        clause: '19011 6.4',
      },
      {
        id: 'informe',
        title: 'Generación del informe',
        summary:
          'Al concluir la auditoría, la plataforma compila el informe con objetivos, alcance, criterios, hallazgos y conclusiones.',
        roles: ['lider', 'direccion', 'dueno_proceso'],
        tasks: [
          'Revise la vista previa del informe generado.',
          'Fírmelo cuando esté correcto.',
          'Distribúyalo a sus destinatarios: debe incluir al menos a una persona de la alta dirección.',
          'Descargue el informe en .docx para compartirlo.',
        ],
        rules: ['La auditoría no pasa a finalizada sin un informe distribuido a la alta dirección.'],
        screens: ['informe.vista_previa', 'informe.distribuir', 'informe.ver'],
        clause: '9.2.2 d',
      },
      {
        id: 'acciones',
        title: 'Asignación de tareas y acciones correctivas',
        summary:
          'Cuando se detecta una desviación, se crea una acción con responsable y fecha límite, y se confirma su cierre.',
        roles: ['dueno_proceso', 'auditor', 'gestor'],
        tasks: [
          'Registre la corrección, la causa raíz, el responsable y la fecha límite de cada no conformidad.',
          'El responsable recibe alertas 7 y 1 día antes de la fecha límite, y al vencer.',
          'El responsable reporta el cierre con sus evidencias.',
          'Un auditor distinto al responsable verifica la eficacia de la acción.',
        ],
        rules: [
          'La fecha límite es obligatoria.',
          'Una acción solo se cierra cuando la verificación de eficacia es correcta.',
        ],
        screens: ['accion.lista', 'accion.crear', 'accion.cierre', 'accion.verificar'],
        clause: '9.2.2 e y 10.2',
      },
      {
        id: 'analisis',
        title: 'Análisis de datos y pista de auditoría',
        summary:
          'La información queda centralizada para ver tendencias, medir el cumplimiento y comprobar quién hizo qué y cuándo.',
        roles: ['gestor', 'direccion'],
        tasks: [
          'Consulte el tablero del programa: cumplimiento del calendario, no conformidades por proceso y acciones vencidas.',
          'Busque cualquier registro por entidad, versión y fecha.',
          'Revise el historial de un registro: cada versión conserva su fecha, hora y usuario.',
          'Lleve los resultados a la revisión por la dirección.',
        ],
        rules: ['La información documentada se versiona con huella y no se borra.'],
        screens: ['dashboard.programa', 'registro.buscar', 'registro.historial', 'revision.direccion'],
        clause: '9.2.2 f y 7.5',
      },
    ],
  },
} as const satisfies Record<string, WorkflowDefinition>;

export type WorkflowId = keyof typeof WORKFLOWS;
