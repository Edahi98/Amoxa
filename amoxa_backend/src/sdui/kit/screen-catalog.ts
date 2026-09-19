export interface ScreenPresentation {
  icon: string;
  description: string;
}

export class ScreenCatalog {
  private static readonly FALLBACK: ScreenPresentation = { icon: 'arrow-right', description: '' };

  private static readonly ENTRIES: Readonly<Record<string, ScreenPresentation>> = {
    notificaciones: { icon: 'bell', description: 'Avisos y recordatorios pendientes.' },
    inicio: { icon: 'house', description: 'Resumen y accesos según su rol.' },
    'programa.lista': { icon: 'calendar-blank', description: 'Calendario y estado de los programas anuales.' },
    'programa.editar': { icon: 'note-pencil', description: 'Crear o modificar un programa.' },
    'programa.aprobar': { icon: 'seal-check', description: 'Revisar y aprobar el programa.' },
    'plantilla.lista': { icon: 'list-checks', description: 'Plantillas de checklist por proceso.' },
    'plantilla.editar': { icon: 'note-pencil', description: 'Editar preguntas y criterios.' },
    'plantilla.publicar': { icon: 'paper-plane-tilt', description: 'Publicar una versión de la plantilla.' },
    'auditor.lista': { icon: 'users', description: 'Auditores y su competencia vigente.' },
    'auditor.ficha': { icon: 'identification-card', description: 'Formación, experiencia y estado.' },
    'auditor.evaluacion': { icon: 'clipboard-text', description: 'Registrar una evaluación de competencia.' },
    'dashboard.programa': { icon: 'chart-line-up', description: 'Indicadores de cumplimiento del programa.' },
    'revision.direccion': { icon: 'presentation-chart', description: 'Revisión por la dirección.' },
    'revision.programa': { icon: 'arrows-clockwise', description: 'Lecciones aprendidas y nueva versión.' },
    'registro.buscar': { icon: 'magnifying-glass', description: 'Buscar información documentada.' },
    'registro.historial': { icon: 'clock-counter-clockwise', description: 'Historial de versiones de un registro.' },
    'auditoria.lista': { icon: 'clipboard-text', description: 'Auditorías del programa y su estado.' },
    'auditoria.alcance': { icon: 'target', description: 'Alcance, criterios y método.' },
    'auditoria.contacto': { icon: 'handshake', description: 'Contacto y viabilidad con el área.' },
    'auditoria.equipo': { icon: 'users-three', description: 'Asignar el equipo auditor.' },
    'auditoria.plan': { icon: 'calendar-check', description: 'Plan y agenda de la auditoría.' },
    'auditoria.plan_aprobar': { icon: 'seal-check', description: 'Aprobar el plan propuesto.' },
    'ejecucion.apertura': { icon: 'play-circle', description: 'Reunión de apertura y asistencia.' },
    'ejecucion.checklist': { icon: 'list-checks', description: 'Responder el checklist de la auditoría.' },
    'ejecucion.evidencia': { icon: 'camera', description: 'Capturar evidencia con fecha y ubicación.' },
    'hallazgo.lista': { icon: 'warning-circle', description: 'Hallazgos y no conformidades.' },
    'ejecucion.cierre': { icon: 'flag', description: 'Reunión de cierre y conclusiones.' },
    'informe.vista_previa': { icon: 'file-text', description: 'Revisar y firmar el informe.' },
    'informe.distribuir': { icon: 'paper-plane-tilt', description: 'Enviar el informe a sus destinatarios.' },
    'informe.ver': { icon: 'file-text', description: 'Leer el informe de auditoría.' },
    'accion.lista': { icon: 'list-bullets', description: 'Acciones correctivas y sus plazos.' },
    'accion.crear': { icon: 'plus-circle', description: 'Registrar una acción correctiva.' },
    'accion.cierre': { icon: 'check-circle', description: 'Reportar el cierre de una acción.' },
    'accion.verificar': { icon: 'seal-check', description: 'Verificar la eficacia de una acción.' },
    'usuario.lista': { icon: 'users', description: 'Cuentas, roles y estado de acceso.' },
    'usuario.crear': { icon: 'user-plus', description: 'Dar de alta con enlace de invitación.' },
    'usuario.editar': { icon: 'user-gear', description: 'Datos, rol y acceso de una cuenta.' },
    'solicitud.lista': { icon: 'key', description: 'Aprobar o rechazar restablecimientos.' },
    'flujo.lista': { icon: 'list-checks', description: 'Guías paso a paso de cada proceso.' },
    'flujo.guia': { icon: 'list-checks', description: 'Pasos, participantes y pantallas de un flujo.' },
    'flujo.avance': { icon: 'list-checks', description: 'Avance de un flujo en curso.' },
    'marca.editar': { icon: 'paint-brush', description: 'Logotipo, color y pie de los informes.' },
    'perfil.editar': { icon: 'user-circle', description: 'Sus datos y su contraseña.' },
  };

  public static of(screenId: string): ScreenPresentation {
    return ScreenCatalog.ENTRIES[screenId] ?? ScreenCatalog.FALLBACK;
  }
}
