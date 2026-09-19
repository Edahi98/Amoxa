import { eq } from 'drizzle-orm';
import {
  auditor,
  auditoria,
  auditoriaProceso,
  equipoAuditoria,
  plantillaChecklist,
  pregunta,
  proceso,
  programaAuditoria,
  usuario,
} from '@db/schema/index.js';
import type { TestDatabase } from '@testing-database/test-database.js';
import { TestSeed, type SeededUser } from '@testing-database/test-seed.js';

export interface EjecucionScenario {
  organizacionId: string;
  admin: SeededUser;
  lider: SeededUser;
  auditor: SeededUser;
  segundoAuditor: SeededUser;
  auditado: SeededUser;
  ajeno: SeededUser;
  procesoId: string;
  segundoProcesoId: string;
  auditoriaId: string;
  preguntas: { id: string; orden: number }[];
}

export class EjecucionSeed {
  public static async create(
    database: TestDatabase,
    options: { estado?: 'planificada' | 'en_curso' | 'cerrada'; planAprobado?: boolean; procesos?: 1 | 2 } = {},
  ): Promise<EjecucionScenario> {
    const organizacionId = await TestSeed.organizacion(database);
    const admin = await TestSeed.usuario(database, organizacionId, 'admin');
    const lider = await TestSeed.usuario(database, organizacionId, 'lider_auditor');
    const auditorUser = await TestSeed.usuario(database, organizacionId, 'auditor');
    const segundoAuditor = await TestSeed.usuario(database, organizacionId, 'auditor');
    const auditado = await TestSeed.usuario(database, organizacionId, 'auditado');
    const otroAuditado = await TestSeed.usuario(database, organizacionId, 'auditado');
    const ajeno = await TestSeed.usuario(database, organizacionId, 'auditor');

    const [proc] = await database.orm
      .insert(proceso)
      .values({ organizacionId, nombre: 'Compras', duenoUsuarioId: auditado.id, importancia: 'alta', nivelRiesgo: 3 })
      .returning({ id: proceso.id });
    await database.orm.update(usuario).set({ procesoId: proc.id }).where(eq(usuario.id, auditado.id));
    const [second] = await database.orm
      .insert(proceso)
      .values({ organizacionId, nombre: 'Ventas', duenoUsuarioId: otroAuditado.id, importancia: 'media', nivelRiesgo: 2 })
      .returning({ id: proceso.id });

    const [programa] = await database.orm
      .insert(programaAuditoria)
      .values({ organizacionId, periodo: '2026' })
      .returning({ id: programaAuditoria.id });
    const [plantilla] = await database.orm
      .insert(plantillaChecklist)
      .values({ organizacionId, nombre: 'Plantilla ISO 9001' })
      .returning({ id: plantillaChecklist.id });
    const preguntas = await database.orm
      .insert(pregunta)
      .values([
        { plantillaId: plantilla.id, orden: 1, texto: 'La política de la calidad está disponible.', clausulaRef: '5.2', tipoCriterio: 'ISO_9001', tipoRespuesta: 'si_no' },
        { plantillaId: plantilla.id, orden: 2, texto: 'La información documentada se controla.', clausulaRef: '7.5', tipoCriterio: 'propio', tipoRespuesta: 'si_no' },
        { plantillaId: plantilla.id, orden: 3, texto: 'Se analizan los resultados de seguimiento.', clausulaRef: '9.1', tipoCriterio: 'ISO_9001', tipoRespuesta: 'si_no' },
      ])
      .returning({ id: pregunta.id, orden: pregunta.orden });

    const [audit] = await database.orm
      .insert(auditoria)
      .values({
        programaId: programa.id,
        plantillaId: plantilla.id,
        liderId: lider.id,
        objetivos: 'Verificar el sistema de gestión',
        criterios: ['ISO 9001:2015'],
        metodo: 'in_situ',
        fechaPlan: '2026-03-10',
        planAprobado: options.planAprobado ?? true,
        estado: options.estado ?? 'en_curso',
      })
      .returning({ id: auditoria.id });
    await database.orm.insert(auditoriaProceso).values({ auditoriaId: audit.id, procesoId: proc.id });
    if (options.procesos === 2) {
      await database.orm.insert(auditoriaProceso).values({ auditoriaId: audit.id, procesoId: second.id });
    }
    await database.orm.insert(auditor).values([
      { usuarioId: auditorUser.id, estado: 'apto' },
      { usuarioId: segundoAuditor.id, estado: 'apto' },
      { usuarioId: ajeno.id, estado: 'apto' },
      { usuarioId: lider.id, estado: 'apto' },
    ]);
    await database.orm.insert(equipoAuditoria).values([
      { auditoriaId: audit.id, auditorId: lider.id, rol: 'lider' },
      { auditoriaId: audit.id, auditorId: auditorUser.id, rol: 'auditor' },
      { auditoriaId: audit.id, auditorId: segundoAuditor.id, rol: 'auditor' },
    ]);

    return {
      organizacionId,
      admin,
      lider,
      auditor: auditorUser,
      segundoAuditor,
      auditado,
      ajeno,
      procesoId: proc.id,
      segundoProcesoId: second.id,
      auditoriaId: audit.id,
      preguntas: preguntas.sort((a, b) => a.orden - b.orden),
    };
  }
}
