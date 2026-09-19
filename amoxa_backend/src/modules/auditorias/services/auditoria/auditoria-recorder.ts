import { Injectable } from '@nestjs/common';
import type { DbExecutor } from '@db/db-executor.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import type { AuditoriaDetalle } from '@auditorias-types/auditoria-detalle.js';
import { AuditoriaReader } from '@auditorias-services-auditoria/auditoria-reader.js';
import { AuditoriaSnapshot } from '@auditorias-services-auditoria/auditoria-snapshot.js';

@Injectable()
export class AuditoriaRecorder {
  public static readonly ENTITY = 'auditoria';

  constructor(
    private readonly reader: AuditoriaReader,
    private readonly versions: RecordVersionService,
  ) {}

  public async record(id: string, user: TokenPayload, executor: DbExecutor): Promise<AuditoriaDetalle> {
    const detalle = await this.reader.load(id, user.organizacionId, executor);
    await this.versions.record(
      { entidadTipo: AuditoriaRecorder.ENTITY, entidadId: id, creadoPorId: user.sub, contenido: AuditoriaSnapshot.of(detalle) },
      executor,
    );
    return detalle;
  }
}
