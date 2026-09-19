import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import type { DbExecutor } from '@db/db-executor.js';
import { adjunto, respuestaEvidencia } from '@schemas/index.js';
import type { GeoPoint } from '@schemas/types.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import type { ArchivoDeclarado, SubirEvidenciaInput } from '@validators-ejecucion/subir-evidencia.schema.js';
import { AuditoriaAccessService } from '@ejecucion-acceso-auditoria/auditoria-access.service.js';
import { EvidenceStorage } from '@ejecucion-evidencia/evidence-storage.js';
import { EvidencePolicy } from '@ejecucion-evidencia/evidence-policy.js';
import { EvidenceViewMapper, type AdjuntoRow, type EvidenceView } from '@ejecucion-evidencia/evidence-view.js';
import { FileDigest } from '@ejecucion-evidencia-file/file-digest.js';
import { FileSignature } from '@ejecucion-evidencia-file/file-signature.js';
import type { UploadedEvidence } from '@ejecucion-evidencia/uploaded-evidence.js';
import { AuditTransitions } from '@ejecucion-reglas/audit-transitions.js';
import { BusinessRule } from '@ejecucion-reglas/business-rule.js';

type RespuestaRow = typeof respuestaEvidencia.$inferSelect;

export interface DeclaredEvidenceResult {
  guardadas: EvidenceView[];
  omitidas: number;
  verificada: boolean;
}

export interface ServedEvidence {
  content: Buffer;
  mimeType: string;
  fileName: string;
}

@Injectable()
export class EvidenceService {
  private static readonly CLOCK_SKEW_MS = 5 * 60 * 1000;

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly access: AuditoriaAccessService,
    private readonly storage: EvidenceStorage,
    private readonly versions: RecordVersionService,
  ) {}

  public async list(
    auditoriaId: string,
    respuestaId: string,
    user: TokenPayload,
    executor: DbExecutor = this.db,
  ): Promise<EvidenceView[]> {
    await this.access.loadAsMember(auditoriaId, user, executor);
    const respuesta = await this.findAnswer(executor, auditoriaId, respuestaId);
    const rows = await this.files(executor, respuesta.id);
    return rows.map((row) => EvidenceViewMapper.from(row, respuesta.verificada));
  }

  public async verificationOf(
    auditoriaId: string,
    respuestaId: string,
    user: TokenPayload,
    executor: DbExecutor = this.db,
  ): Promise<{ respuestaId: string; verificada: boolean; archivos: number }> {
    await this.access.loadAsMember(auditoriaId, user, executor);
    const respuesta = await this.findAnswer(executor, auditoriaId, respuestaId);
    const rows = await this.files(executor, respuesta.id);
    return { respuestaId: respuesta.id, verificada: respuesta.verificada && rows.length > 0, archivos: rows.length };
  }

  public async storeFile(
    auditoriaId: string,
    respuestaId: string,
    user: TokenPayload,
    file: UploadedEvidence,
    fields: SubirEvidenciaInput,
  ): Promise<EvidenceView> {
    const mimeIssue = EvidencePolicy.mimeViolation(file.mimetype);
    if (mimeIssue !== undefined) {
      throw new UnsupportedMediaTypeException(mimeIssue);
    }
    const sizeIssue = EvidencePolicy.sizeViolation(file.buffer.length);
    if (sizeIssue !== undefined) {
      throw file.buffer.length === 0 ? BusinessRule.violation(sizeIssue) : new PayloadTooLargeException(sizeIssue);
    }
    if (!FileSignature.matches(file.mimetype, file.buffer)) {
      throw BusinessRule.violation('El contenido del archivo no corresponde al tipo declarado.');
    }
    const hash = FileDigest.sha256(file.buffer);
    if (fields.sha256 !== undefined && fields.sha256 !== hash) {
      throw BusinessRule.violation('La huella SHA-256 enviada no coincide con el contenido recibido.');
    }
    const capturedAt = this.captureDate(fields.capturadoEn);
    const geo = this.geoOf(fields.latitud, fields.longitud);

    return this.db.transaction(async (tx) => {
      const context = await this.access.loadAsMember(auditoriaId, user, tx);
      BusinessRule.assert(AuditTransitions.executionViolation(context.auditoria.estado));
      const respuesta = await this.findAnswer(tx, auditoriaId, respuestaId);

      if (fields.clienteId !== undefined) {
        const repeated = (await this.files(tx, respuesta.id)).find((row) => row.clienteId === fields.clienteId);
        if (repeated !== undefined) {
          return EvidenceViewMapper.from(repeated, respuesta.verificada);
        }
      }

      const id = randomUUID();
      const safeName = EvidencePolicy.sanitizeName(file.originalname);
      const key = this.storage.keyFor(context.organizacionId, auditoriaId, id, safeName);
      const [row] = await tx
        .insert(adjunto)
        .values({
          id,
          respuestaId: respuesta.id,
          tipo: EvidencePolicy.typeFor(file.mimetype, fields.tipo),
          url: key,
          hash,
          nombreOriginal: safeName,
          mime: file.mimetype.toLowerCase(),
          tamanoBytes: file.buffer.length,
          capturadoEn: capturedAt,
          geo,
          almacenado: true,
          clienteId: fields.clienteId ?? null,
          creadoPorId: user.sub,
        })
        .returning();
      await this.storage.write(key, file.buffer);
      await this.recordVersion(tx, row, user);
      return EvidenceViewMapper.from(row, respuesta.verificada);
    });
  }

  public async storeDeclared(
    auditoriaId: string,
    respuestaId: string,
    user: TokenPayload,
    input: SubirEvidenciaInput,
  ): Promise<DeclaredEvidenceResult> {
    const declared = input.evidencia?.archivos ?? input.archivos ?? [];
    const place = input.evidencia?.ubicacion ?? undefined;

    return this.db.transaction(async (tx) => {
      const context = await this.access.loadAsMember(auditoriaId, user, tx);
      BusinessRule.assert(AuditTransitions.executionViolation(context.auditoria.estado));
      const respuesta = await this.findAnswer(tx, auditoriaId, respuestaId);
      const outcome = await this.declareWithin(tx, respuesta, declared, place, user);

      if (outcome.saved.length === 0 && outcome.existing === 0) {
        throw BusinessRule.violation('Adjunte al menos un archivo como evidencia.', 'EVIDENCIA_VACIA');
      }
      let verified = respuesta.verificada;
      if (input.evidencia?.verificada === true && !verified) {
        await this.markVerified(tx, respuesta, true, user);
        verified = true;
      }
      return {
        guardadas: outcome.saved.map((row) => EvidenceViewMapper.from(row, verified)),
        omitidas: outcome.skipped,
        verificada: verified,
      };
    });
  }

  public async declareWithin(
    tx: DbExecutor,
    respuesta: RespuestaRow,
    declared: readonly ArchivoDeclarado[],
    place: { latitude?: number; longitude?: number } | undefined,
    user: TokenPayload,
  ): Promise<{ saved: AdjuntoRow[]; skipped: number; existing: number }> {
    const existing = await this.files(tx, respuesta.id);
    const known = new Set(existing.flatMap((row) => [row.id, row.clienteId ?? row.id]));
    const saved: AdjuntoRow[] = [];
    let skipped = 0;
    for (const item of declared) {
      if (known.has(item.id)) {
        skipped += 1;
        continue;
      }
      this.assertDeclared(item);
      const [row] = await tx
        .insert(adjunto)
        .values({
          respuestaId: respuesta.id,
          tipo: EvidencePolicy.typeFor(item.mimeType),
          url: `cliente:${item.id}`,
          hash: item.sha256 ?? null,
          nombreOriginal: EvidencePolicy.sanitizeName(item.name),
          mime: item.mimeType.toLowerCase(),
          tamanoBytes: item.size,
          capturadoEn: this.captureDate(item.capturedAt),
          geo: this.geoOf(item.latitude ?? place?.latitude, item.longitude ?? place?.longitude),
          almacenado: false,
          clienteId: item.id,
          creadoPorId: user.sub,
        })
        .returning();
      known.add(item.id);
      saved.push(row);
      await this.recordVersion(tx, row, user);
    }
    return { saved, skipped, existing: existing.length };
  }

  public async verify(
    auditoriaId: string,
    respuestaId: string,
    user: TokenPayload,
    verificada = true,
  ): Promise<{ respuestaId: string; verificada: boolean; archivos: number }> {
    return this.db.transaction(async (tx) => {
      const context = await this.access.loadAsMember(auditoriaId, user, tx);
      BusinessRule.assert(AuditTransitions.executionViolation(context.auditoria.estado));
      const respuesta = await this.findAnswer(tx, auditoriaId, respuestaId);
      const files = await this.files(tx, respuesta.id);
      if (verificada && files.length === 0) {
        throw BusinessRule.violation('Adjunte al menos un archivo como evidencia antes de verificarla.', 'EVIDENCIA_VACIA');
      }
      if (respuesta.verificada !== verificada) {
        await this.markVerified(tx, respuesta, verificada, user);
      }
      return { respuestaId: respuesta.id, verificada, archivos: files.length };
    });
  }

  public async read(
    auditoriaId: string,
    respuestaId: string,
    adjuntoId: string,
    user: TokenPayload,
  ): Promise<ServedEvidence> {
    await this.access.loadAsMember(auditoriaId, user);
    const respuesta = await this.findAnswer(this.db, auditoriaId, respuestaId);
    const [row] = await this.db
      .select()
      .from(adjunto)
      .where(and(eq(adjunto.id, adjuntoId), eq(adjunto.respuestaId, respuesta.id)))
      .limit(1);
    if (row === undefined) {
      throw new NotFoundException('Evidencia no encontrada');
    }
    if (!row.almacenado) {
      throw new NotFoundException('El archivo de esta evidencia no está almacenado en el servidor.');
    }
    let content: Buffer;
    try {
      content = await this.storage.read(row.url);
    } catch {
      throw new NotFoundException('El archivo de la evidencia no está disponible.');
    }
    if (row.hash === null || FileDigest.sha256(content) !== row.hash) {
      throw new ConflictException(
        'La huella SHA-256 del archivo no coincide con la registrada: la evidencia pudo haber sido alterada.',
      );
    }
    return { content, mimeType: row.mime ?? 'application/octet-stream', fileName: row.nombreOriginal ?? 'archivo' };
  }

  private async markVerified(
    tx: DbExecutor,
    respuesta: RespuestaRow,
    verificada: boolean,
    user: TokenPayload,
  ): Promise<void> {
    const [updated] = await tx
      .update(respuestaEvidencia)
      .set({ verificada, version: respuesta.version + 1 })
      .where(eq(respuestaEvidencia.id, respuesta.id))
      .returning();
    await this.versions.record(
      {
        entidadTipo: 'respuesta_evidencia',
        entidadId: updated.id,
        creadoPorId: user.sub,
        contenido: {
          auditoriaId: updated.auditoriaId,
          preguntaId: updated.preguntaId,
          resultado: updated.resultado,
          comentario: updated.comentario,
          verificada: updated.verificada,
          version: updated.version,
        },
      },
      tx,
    );
  }

  private async recordVersion(tx: DbExecutor, row: AdjuntoRow, user: TokenPayload): Promise<void> {
    await this.versions.record(
      {
        entidadTipo: 'adjunto',
        entidadId: row.id,
        creadoPorId: user.sub,
        contenido: {
          respuestaId: row.respuestaId,
          tipo: row.tipo,
          url: row.url,
          hash: row.hash,
          nombre: row.nombreOriginal,
          mime: row.mime,
          tamanoBytes: row.tamanoBytes,
          capturadoEn: row.capturadoEn.toISOString(),
          geo: row.geo,
          almacenado: row.almacenado,
        },
      },
      tx,
    );
  }

  private assertDeclared(item: ArchivoDeclarado): void {
    const mimeIssue = EvidencePolicy.mimeViolation(item.mimeType);
    if (mimeIssue !== undefined) {
      throw new UnsupportedMediaTypeException(mimeIssue);
    }
    const sizeIssue = EvidencePolicy.sizeViolation(item.size);
    if (sizeIssue !== undefined) {
      throw item.size > EvidencePolicy.MAX_BYTES ? new PayloadTooLargeException(sizeIssue) : BusinessRule.violation(sizeIssue);
    }
  }

  private captureDate(value: string | undefined): Date {
    if (value === undefined) {
      return new Date();
    }
    const date = new Date(value);
    if (date.getTime() > Date.now() + EvidenceService.CLOCK_SKEW_MS) {
      throw new UnprocessableEntityException('La fecha de captura no puede estar en el futuro.');
    }
    return date;
  }

  private geoOf(latitude: number | undefined, longitude: number | undefined): GeoPoint | null {
    return latitude === undefined || longitude === undefined ? null : { x: longitude, y: latitude };
  }

  private async findAnswer(executor: DbExecutor, auditoriaId: string, respuestaId: string): Promise<RespuestaRow> {
    const [row] = await executor
      .select()
      .from(respuestaEvidencia)
      .where(and(eq(respuestaEvidencia.id, respuestaId), eq(respuestaEvidencia.auditoriaId, auditoriaId)))
      .limit(1);
    if (row === undefined) {
      throw new NotFoundException('Respuesta no encontrada');
    }
    return row;
  }

  private async files(executor: DbExecutor, respuestaId: string): Promise<AdjuntoRow[]> {
    return executor.select().from(adjunto).where(eq(adjunto.respuestaId, respuestaId)).orderBy(asc(adjunto.capturadoEn));
  }
}
