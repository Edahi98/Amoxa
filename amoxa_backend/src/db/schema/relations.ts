import { relations } from 'drizzle-orm';
import { organizacion } from '@schemas-organizacion/organizacion.schema.js';
import { usuario } from '@schemas-organizacion/usuario.schema.js';
import { proceso } from '@schemas-organizacion/proceso.schema.js';
import { plantillaChecklist } from '@schemas-auditoria/plantilla-checklist.schema.js';
import { pregunta } from '@schemas-auditoria/pregunta.schema.js';
import { programaAuditoria } from '@schemas-auditoria/programa-auditoria.schema.js';
import { auditoria } from '@schemas-auditoria/auditoria.schema.js';
import { auditor } from '@schemas-auditor/auditor.schema.js';
import { evaluacionCompetencia } from '@schemas-auditor/evaluacion-competencia.schema.js';
import { equipoAuditoria } from '@schemas-auditor/equipo-auditoria.schema.js';
import { auditoriaProceso } from '@schemas-auditoria/auditoria-proceso.schema.js';
import { respuestaEvidencia } from '@schemas-evidencia/respuesta-evidencia.schema.js';
import { adjunto } from '@schemas-evidencia/adjunto.schema.js';
import { hallazgo } from '@schemas-evidencia/hallazgo.schema.js';
import { accion } from '@schemas-evidencia/accion.schema.js';
import { informe } from '@schemas-informe/informe.schema.js';
import { distribucionInforme } from '@schemas-informe/distribucion-informe.schema.js';
import { informacionDocumentada } from '@schemas/informacion-documentada.schema.js';
import { token } from '@schemas/token.schema.js';

export const organizacionRelations = relations(organizacion, ({ many }) => ({
  usuarios: many(usuario),
  procesos: many(proceso),
  programasAuditoria: many(programaAuditoria),
}));

export const usuarioRelations = relations(usuario, ({ one, many }) => ({
  organizacion: one(organizacion, {
    fields: [usuario.organizacionId],
    references: [organizacion.id],
  }),
  proceso: one(proceso, {
    fields: [usuario.procesoId],
    references: [proceso.id],
    relationName: 'usuarioProceso',
  }),
  procesosPropios: many(proceso, { relationName: 'procesoDueno' }),
  auditor: one(auditor),
  auditoriasLideradas: many(auditoria),
  programasAprobados: many(programaAuditoria),
  evaluacionesRealizadas: many(evaluacionCompetencia),
  accionesResponsable: many(accion, { relationName: 'accionResponsable' }),
  accionesVerificadas: many(accion, { relationName: 'accionVerificador' }),
  informesAceptados: many(informe),
  distribuciones: many(distribucionInforme),
  documentosCreados: many(informacionDocumentada),
  tokens: many(token),
}));

export const procesoRelations = relations(proceso, ({ one, many }) => ({
  organizacion: one(organizacion, {
    fields: [proceso.organizacionId],
    references: [organizacion.id],
  }),
  dueno: one(usuario, {
    fields: [proceso.duenoUsuarioId],
    references: [usuario.id],
    relationName: 'procesoDueno',
  }),
  usuarios: many(usuario, { relationName: 'usuarioProceso' }),
  auditoriaProceso: many(auditoriaProceso),
  hallazgos: many(hallazgo),
}));

export const plantillaChecklistRelations = relations(plantillaChecklist, ({ many }) => ({
  preguntas: many(pregunta),
  auditorias: many(auditoria),
}));

export const preguntaRelations = relations(pregunta, ({ one, many }) => ({
  plantilla: one(plantillaChecklist, {
    fields: [pregunta.plantillaId],
    references: [plantillaChecklist.id],
  }),
  respuestas: many(respuestaEvidencia),
}));

export const programaAuditoriaRelations = relations(programaAuditoria, ({ one, many }) => ({
  organizacion: one(organizacion, {
    fields: [programaAuditoria.organizacionId],
    references: [organizacion.id],
  }),
  aprobadoPor: one(usuario, {
    fields: [programaAuditoria.aprobadoPorId],
    references: [usuario.id],
  }),
  auditorias: many(auditoria),
}));

export const auditoriaRelations = relations(auditoria, ({ one, many }) => ({
  programa: one(programaAuditoria, {
    fields: [auditoria.programaId],
    references: [programaAuditoria.id],
  }),
  plantilla: one(plantillaChecklist, {
    fields: [auditoria.plantillaId],
    references: [plantillaChecklist.id],
  }),
  lider: one(usuario, {
    fields: [auditoria.liderId],
    references: [usuario.id],
  }),
  equipo: many(equipoAuditoria),
  procesos: many(auditoriaProceso),
  respuestas: many(respuestaEvidencia),
  hallazgos: many(hallazgo),
  informe: one(informe, {
    fields: [auditoria.id],
    references: [informe.auditoriaId],
  }),
}));

export const auditorRelations = relations(auditor, ({ one, many }) => ({
  usuario: one(usuario, {
    fields: [auditor.usuarioId],
    references: [usuario.id],
  }),
  evaluaciones: many(evaluacionCompetencia),
  equipos: many(equipoAuditoria),
  respuestas: many(respuestaEvidencia),
}));

export const evaluacionCompetenciaRelations = relations(evaluacionCompetencia, ({ one }) => ({
  auditor: one(auditor, {
    fields: [evaluacionCompetencia.auditorId],
    references: [auditor.usuarioId],
  }),
  evaluador: one(usuario, {
    fields: [evaluacionCompetencia.evaluadorId],
    references: [usuario.id],
  }),
}));

export const equipoAuditoriaRelations = relations(equipoAuditoria, ({ one }) => ({
  auditoria: one(auditoria, {
    fields: [equipoAuditoria.auditoriaId],
    references: [auditoria.id],
  }),
  auditor: one(auditor, {
    fields: [equipoAuditoria.auditorId],
    references: [auditor.usuarioId],
  }),
}));

export const auditoriaProcesoRelations = relations(auditoriaProceso, ({ one }) => ({
  auditoria: one(auditoria, {
    fields: [auditoriaProceso.auditoriaId],
    references: [auditoria.id],
  }),
  proceso: one(proceso, {
    fields: [auditoriaProceso.procesoId],
    references: [proceso.id],
  }),
}));

export const respuestaEvidenciaRelations = relations(respuestaEvidencia, ({ one, many }) => ({
  auditoria: one(auditoria, {
    fields: [respuestaEvidencia.auditoriaId],
    references: [auditoria.id],
  }),
  pregunta: one(pregunta, {
    fields: [respuestaEvidencia.preguntaId],
    references: [pregunta.id],
  }),
  auditor: one(auditor, {
    fields: [respuestaEvidencia.auditorId],
    references: [auditor.usuarioId],
  }),
  adjuntos: many(adjunto),
  hallazgos: many(hallazgo),
}));

export const adjuntoRelations = relations(adjunto, ({ one }) => ({
  respuesta: one(respuestaEvidencia, {
    fields: [adjunto.respuestaId],
    references: [respuestaEvidencia.id],
  }),
}));

export const hallazgoRelations = relations(hallazgo, ({ one, many }) => ({
  auditoria: one(auditoria, {
    fields: [hallazgo.auditoriaId],
    references: [auditoria.id],
  }),
  respuesta: one(respuestaEvidencia, {
    fields: [hallazgo.respuestaId],
    references: [respuestaEvidencia.id],
  }),
  proceso: one(proceso, {
    fields: [hallazgo.procesoId],
    references: [proceso.id],
  }),
  acciones: many(accion),
}));

export const accionRelations = relations(accion, ({ one }) => ({
  hallazgo: one(hallazgo, {
    fields: [accion.hallazgoId],
    references: [hallazgo.id],
  }),
  responsable: one(usuario, {
    fields: [accion.responsableId],
    references: [usuario.id],
    relationName: 'accionResponsable',
  }),
  verificadoPor: one(usuario, {
    fields: [accion.verificadoPorId],
    references: [usuario.id],
    relationName: 'accionVerificador',
  }),
}));

export const informeRelations = relations(informe, ({ one, many }) => ({
  auditoria: one(auditoria, {
    fields: [informe.auditoriaId],
    references: [auditoria.id],
  }),
  aceptadoPor: one(usuario, {
    fields: [informe.aceptadoPorId],
    references: [usuario.id],
  }),
  distribuciones: many(distribucionInforme),
}));

export const distribucionInformeRelations = relations(distribucionInforme, ({ one }) => ({
  informe: one(informe, {
    fields: [distribucionInforme.informeId],
    references: [informe.id],
  }),
  usuario: one(usuario, {
    fields: [distribucionInforme.usuarioId],
    references: [usuario.id],
  }),
}));

export const informacionDocumentadaRelations = relations(informacionDocumentada, ({ one }) => ({
  creadoPor: one(usuario, {
    fields: [informacionDocumentada.creadoPorId],
    references: [usuario.id],
  }),
}));

export const tokenRelations = relations(token, ({ one }) => ({
  usuario: one(usuario, {
    fields: [token.usuarioId],
    references: [usuario.id],
  }),
}));
