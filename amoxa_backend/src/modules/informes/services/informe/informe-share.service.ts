import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { informeEnlace } from '@schemas/index.js';
import type { SessionRole } from '@shared/roles.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { SecretToken } from '@common-security/secret-token.js';
import type { DocxFile } from '@docx/docx-file.js';
import { InformeAuditoriaDocument } from '@docx-informes/informe-auditoria.document.js';
import { AuditActions } from '@seguridad/audit-actions.js';
import { SecurityLogService } from '@seguridad/security-log.service.js';
import { MarcaService } from '@marca-services/marca.service.js';
import { InformeLoaderService } from '@informes-services-informe/informe-loader.service.js';
import { InformeReadService } from '@informes-services-informe/informe-read.service.js';

export interface SharedLink {
  enlaceUrl: string;
  enlaceExpira: Date;
}

@Injectable()
export class InformeShareService {
  public static readonly DEFAULT_DAYS = 7;
  private static readonly DAY_MS = 24 * 60 * 60 * 1000;

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly reader: InformeReadService,
    private readonly loader: InformeLoaderService,
    private readonly log: SecurityLogService,
    private readonly marca: MarcaService,
  ) {}

  public static urlFor(rawToken: string, base: string | undefined = process.env.API_PUBLIC_URL): string {
    const root = (base ?? `http://localhost:${process.env.PORT ?? 3000}`).replace(/\/+$/, '');
    return `${root}/compartido/informes/${encodeURIComponent(rawToken)}`;
  }

  public async create(
    informeId: string,
    user: TokenPayload,
    role: SessionRole,
    days: number = InformeShareService.DEFAULT_DAYS,
    ip: string | null = null,
    now: Date = new Date(),
  ): Promise<SharedLink> {
    const detail = await this.reader.get(informeId, user, role);
    if (detail.estado === 'borrador') {
      throw new UnprocessableEntityException('Solo se puede compartir un informe firmado.');
    }

    const raw = SecretToken.generate();
    const expiraEn = new Date(now.getTime() + days * InformeShareService.DAY_MS);
    await this.db.insert(informeEnlace).values({
      informeId: detail.id,
      organizacionId: user.organizacionId,
      tokenHash: SecretToken.hash(raw),
      creadoPorId: user.sub,
      expiraEn,
    });
    await this.log.record({ actorId: user.sub, action: AuditActions.REPORT_LINK_CREATED, metadata: { informeId: detail.id, dias: days }, ip });
    return { enlaceUrl: InformeShareService.urlFor(raw), enlaceExpira: expiraEn };
  }

  public async revokeAll(informeId: string, user: TokenPayload, role: SessionRole, ip: string | null = null): Promise<{ revocados: number }> {
    const detail = await this.reader.get(informeId, user, role);
    const revoked = await this.db
      .update(informeEnlace)
      .set({ revocadoEn: new Date() })
      .where(and(eq(informeEnlace.informeId, detail.id), eq(informeEnlace.organizacionId, user.organizacionId), isNull(informeEnlace.revocadoEn)))
      .returning({ id: informeEnlace.id });
    await this.log.record({ actorId: user.sub, action: AuditActions.REPORT_LINK_REVOKED, metadata: { informeId: detail.id, revocados: revoked.length }, ip });
    return { revocados: revoked.length };
  }

  public async open(rawToken: string, ip: string | null = null, now: Date = new Date()): Promise<DocxFile> {
    const [link] = await this.db
      .select()
      .from(informeEnlace)
      .where(and(eq(informeEnlace.tokenHash, SecretToken.hash(rawToken)), isNull(informeEnlace.revocadoEn), gt(informeEnlace.expiraEn, now)))
      .limit(1);
    if (!link || !SecretToken.matches(link.tokenHash, rawToken)) {
      throw new NotFoundException('Enlace no válido o vencido');
    }

    const detail = await this.loader.detail(link.informeId, link.organizacionId);
    if (detail.estado === 'borrador') {
      throw new NotFoundException('Enlace no válido o vencido');
    }
    await this.log.record({ action: AuditActions.REPORT_LINK_OPENED, metadata: { informeId: link.informeId, enlaceId: link.id }, ip });
    return InformeAuditoriaDocument.build(detail, await this.marca.forDocument(link.organizacionId));
  }
}
