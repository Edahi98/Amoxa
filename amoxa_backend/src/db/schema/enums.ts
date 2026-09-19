import { pgEnum } from 'drizzle-orm/pg-core';

export const rolUsuarioEnum = pgEnum('rol_usuario', [
  'admin',
  'gestor_programa',
  'lider_auditor',
  'auditor',
  'auditado',
  'superusuario',
  'administrador',
]);

export const passwordRequestTypeEnum = pgEnum('password_request_type', ['invite', 'reset']);

export const passwordRequestStatusEnum = pgEnum('password_request_status', [
  'pending',
  'approved',
  'rejected',
  'used',
  'expired',
]);

export const estadoProgramaAuditoriaEnum = pgEnum('estado_programa_auditoria', [
  'borrador',
  'aprobado',
  'en_ejecucion',
  'cerrado',
  'pendiente_aprobacion',
  'devuelto',
]);

export const metodoAuditoriaEnum = pgEnum('metodo_auditoria', [
  'in_situ',
  'remoto',
  'mixto',
]);

export const estadoAuditoriaEnum = pgEnum('estado_auditoria', [
  'planificada',
  'en_curso',
  'cerrada',
  'finalizada',
  'cancelada',
]);

export const importanciaProcesoEnum = pgEnum('importancia_proceso', [
  'alta',
  'media',
  'baja',
]);

export const tipoCriterioEnum = pgEnum('tipo_criterio', [
  'ISO_9001',
  'propio',
  'legal',
  'eficacia',
]);

export const tipoRespuestaEnum = pgEnum('tipo_respuesta', [
  'si_no',
  'escala',
  'texto',
  'multiple',
]);

export const estadoAuditorEnum = pgEnum('estado_auditor', [
  'apto',
  'formacion',
  'no_apto',
]);

export const metodoEvaluacionCompetenciaEnum = pgEnum('metodo_evaluacion_competencia', [
  'revision_registros',
  'retroalimentacion',
  'entrevista',
  'observacion',
  'testimonios',
  'examen',
]);

export const rolEquipoAuditoriaEnum = pgEnum('rol_equipo_auditoria', [
  'lider',
  'auditor',
  'formacion',
  'experto',
]);

export const resultadoRespuestaEnum = pgEnum('resultado_respuesta', ['C', 'NC', 'NA']);

export const tipoAdjuntoEnum = pgEnum('tipo_adjunto', ['foto', 'doc', 'captura', 'video']);

export const tipoHallazgoEnum = pgEnum('tipo_hallazgo', [
  'conformidad',
  'NC',
  'OM',
  'buena_practica',
]);

export const clasificacionHallazgoEnum = pgEnum('clasificacion_hallazgo', ['menor', 'mayor']);

export const estadoHallazgoEnum = pgEnum('estado_hallazgo', [
  'abierto',
  'en_verificacion',
  'cerrado',
]);

export const tipoAccionEnum = pgEnum('tipo_accion', ['correccion', 'correctiva']);

export const verificacionEficaciaEnum = pgEnum('verificacion_eficacia', [
  'ok',
  'no_ok',
  'pendiente',
]);

export const estadoAccionEnum = pgEnum('estado_accion', [
  'pendiente',
  'en_progreso',
  'completada',
  'vencida',
]);

export const confidencialidadEnum = pgEnum('confidencialidad', [
  'publico',
  'interno',
  'confidencial',
  'restringido',
]);

export const estadoPlantillaEnum = pgEnum('estado_plantilla', ['borrador', 'publicada', 'archivada']);

export const estadoPropuestaPreguntaEnum = pgEnum('estado_propuesta_pregunta', [
  'pendiente',
  'aceptada',
  'rechazada',
]);

export const resultadoEvaluacionAuditorEnum = pgEnum('resultado_evaluacion_auditor', [
  'satisfactorio',
  'no_satisfactorio',
]);
