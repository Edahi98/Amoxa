import { eq } from 'drizzle-orm';
import {
  accion,
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

export type ProgramState = 'borrador' | 'aprobado' | 'en_ejecucion' | 'cerrado';
export type AuditState = 'planificada' | 'en_curso' | 'cerrada' | 'finalizada' | 'cancelada';
export type ActionState = 'pendiente' | 'en_progreso' | 'completada' | 'vencida';

export class SeguimientoFixture {
  private plantillaId?: string;
  private orden = 0;

  constructor(private readonly database: TestDatabase) {}

  public async proceso(organizacionId: string, duenoId: string, nombre: string): Promise<string> {
    const [row] = await this.database.orm
      .insert(proceso)
      .values({ organizacionId, nombre, duenoUsuarioId: duenoId, importancia: 'alta', nivelRiesgo: 3 })
      .returning({ id: proceso.id });
    return row.id;
  }

  public async asignarProceso(usuarioId: string, procesoId: string): Promise<void> {
    await this.database.orm.update(usuario).set({ procesoId }).where(eq(usuario.id, usuarioId));
  }

  public async programa(organizacionId: string, periodo: string, estado: ProgramState = 'en_ejecucion'): Promise<string> {
    const [row] = await this.database.orm
      .insert(programaAuditoria)
      .values({ organizacionId, periodo, estado, objetivos: `Objetivos ${periodo}`, frecuencia: 'anual', metodos: 'mixto' })
      .returning({ id: programaAuditoria.id });
    return row.id;
  }

  public async auditoria(programaId: string, liderId: string, estado: AuditState, procesoIds: readonly string[] = []): Promise<string> {
    const [row] = await this.database.orm
      .insert(auditoria)
      .values({ programaId, plantillaId: await this.plantilla(), liderId, metodo: 'in_situ', estado })
      .returning({ id: auditoria.id });
    for (const procesoId of procesoIds) {
      await this.database.orm.insert(auditoriaProceso).values({ auditoriaId: row.id, procesoId });
    }
    return row.id;
  }

  public async equipo(auditoriaId: string, auditorId: string): Promise<void> {
    await this.database.orm.insert(auditor).values({ usuarioId: auditorId, estado: 'apto' }).onConflictDoNothing();
    await this.database.orm.insert(equipoAuditoria).values({ auditoriaId, auditorId, rol: 'auditor' });
  }

  public async hallazgo(
    auditoriaId: string,
    procesoId: string,
    auditorId: string,
    tipo: 'conformidad' | 'NC' | 'OM' | 'buena_practica',
    estado: 'abierto' | 'en_verificacion' | 'cerrado' = 'abierto',
  ): Promise<string> {
    await this.database.orm.insert(auditor).values({ usuarioId: auditorId, estado: 'apto' }).onConflictDoNothing();
    const [respuesta] = await this.database.orm
      .insert(respuestaEvidencia)
      .values({ auditoriaId, preguntaId: await this.pregunta(), auditorId, resultado: tipo === 'NC' ? 'NC' : 'C' })
      .returning({ id: respuestaEvidencia.id });
    const [row] = await this.database.orm
      .insert(hallazgo)
      .values({ auditoriaId, respuestaId: respuesta.id, procesoId, tipo, estado, descripcion: `Hallazgo ${tipo}` })
      .returning({ id: hallazgo.id });
    return row.id;
  }

  public async accion(
    hallazgoId: string,
    responsableId: string,
    estado: ActionState,
    fechaLimite: string | null,
    descripcion = 'Acción correctiva',
  ): Promise<string> {
    const [row] = await this.database.orm
      .insert(accion)
      .values({ hallazgoId, responsableId, tipo: 'correctiva', descripcion, estado, fechaLimite })
      .returning({ id: accion.id });
    return row.id;
  }

  private async plantilla(): Promise<string> {
    if (this.plantillaId === undefined) {
      const [row] = await this.database.orm.insert(plantillaChecklist).values({ nombre: 'Plantilla de prueba' }).returning({ id: plantillaChecklist.id });
      this.plantillaId = row.id;
    }
    return this.plantillaId;
  }

  private async pregunta(): Promise<string> {
    this.orden += 1;
    const [row] = await this.database.orm
      .insert(pregunta)
      .values({
        plantillaId: await this.plantilla(),
        orden: this.orden,
        texto: 'Pregunta de prueba',
        tipoCriterio: 'ISO_9001',
        tipoRespuesta: 'si_no',
      })
      .returning({ id: pregunta.id });
    return row.id;
  }
}
