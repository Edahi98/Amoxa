import { eq } from 'drizzle-orm';
import {
  auditor,
  auditoria,
  auditoriaProceso,
  equipoAuditoria,
  hallazgo,
  plantillaChecklist,
  pregunta,
  proceso,
  programaAuditoria,
  respuestaEvidencia,
  usuario,
} from '@db/schema/index.js';
import type { TestDatabase } from '@testing-database/test-database.js';
import { TestSeed, type SeededUser } from '@testing-database/test-seed.js';

export interface AuditScenario {
  organizacionId: string;
  admin: SeededUser;
  gestor: SeededUser;
  lider: SeededUser;
  auditor: SeededUser;
  auditado: SeededUser;
  procesoId: string;
  auditoriaId: string;
  hallazgoNcId: string;
  hallazgoOmId: string;
}

export class AuditFlowSeed {
  public static async create(
    database: TestDatabase,
    estadoAuditoria: 'planificada' | 'en_curso' | 'cerrada' | 'finalizada' = 'cerrada',
  ): Promise<AuditScenario> {
    const organizacionId = await TestSeed.organizacion(database);
    const admin = await TestSeed.usuario(database, organizacionId, 'admin');
    const gestor = await TestSeed.usuario(database, organizacionId, 'gestor_programa');
    const lider = await TestSeed.usuario(database, organizacionId, 'lider_auditor');
    const auditorUser = await TestSeed.usuario(database, organizacionId, 'auditor');
    const auditado = await TestSeed.usuario(database, organizacionId, 'auditado');

    const [proc] = await database.orm
      .insert(proceso)
      .values({ organizacionId, nombre: 'Compras', duenoUsuarioId: auditado.id, importancia: 'alta', nivelRiesgo: 3 })
      .returning({ id: proceso.id });
    await database.orm.update(usuario).set({ procesoId: proc.id }).where(eq(usuario.id, auditado.id));

    const [programa] = await database.orm
      .insert(programaAuditoria)
      .values({ organizacionId, periodo: '2026' })
      .returning({ id: programaAuditoria.id });
    const [plantilla] = await database.orm
      .insert(plantillaChecklist)
      .values({ organizacionId, nombre: 'Plantilla de prueba' })
      .returning({ id: plantillaChecklist.id });
    const [question] = await database.orm
      .insert(pregunta)
      .values({ plantillaId: plantilla.id, orden: 1, texto: 'Pregunta', clausulaRef: '8.4', tipoCriterio: 'ISO_9001', tipoRespuesta: 'si_no' })
      .returning({ id: pregunta.id });
    const [audit] = await database.orm
      .insert(auditoria)
      .values({
        programaId: programa.id,
        plantillaId: plantilla.id,
        liderId: lider.id,
        objetivos: 'Verificar el control de proveedores',
        criterios: ['ISO 9001:2015 8.4'],
        metodo: 'in_situ',
        fechaPlan: '2026-03-10',
        fechaReal: '2026-03-12',
        estado: estadoAuditoria,
      })
      .returning({ id: auditoria.id });
    await database.orm.insert(auditoriaProceso).values({ auditoriaId: audit.id, procesoId: proc.id });
    await database.orm.insert(auditor).values({ usuarioId: auditorUser.id, estado: 'apto' });
    await database.orm.insert(equipoAuditoria).values({ auditoriaId: audit.id, auditorId: auditorUser.id, rol: 'auditor' });
    const [answer] = await database.orm
      .insert(respuestaEvidencia)
      .values({ auditoriaId: audit.id, preguntaId: question.id, auditorId: auditorUser.id, resultado: 'NC' })
      .returning({ id: respuestaEvidencia.id });

    const [nc] = await database.orm
      .insert(hallazgo)
      .values({
        auditoriaId: audit.id,
        respuestaId: answer.id,
        procesoId: proc.id,
        tipo: 'NC',
        clasificacion: 'mayor',
        criterioIncumplido: '8.4.1',
        descripcion: 'No se evalúan los proveedores críticos',
      })
      .returning({ id: hallazgo.id });
    const [om] = await database.orm
      .insert(hallazgo)
      .values({
        auditoriaId: audit.id,
        respuestaId: answer.id,
        procesoId: proc.id,
        tipo: 'OM',
        descripcion: 'Digitalizar el registro de compras',
      })
      .returning({ id: hallazgo.id });

    return {
      organizacionId,
      admin,
      gestor,
      lider,
      auditor: auditorUser,
      auditado,
      procesoId: proc.id,
      auditoriaId: audit.id,
      hallazgoNcId: nc.id,
      hallazgoOmId: om.id,
    };
  }
}
