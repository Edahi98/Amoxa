import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { organizacionMarca } from '@schemas/index.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import { EncodedFileReader } from '@common-files/encoded-file-reader.js';
import type { EncodedFileInput } from '@common-files/encoded-file.schema.js';
import { ImageKind } from '@common-files/image-kind.js';
import type { DocxBrand } from '@docx/docx-brand.js';
import { AuditActions } from '@seguridad/audit-actions.js';
import { SecurityLogService } from '@seguridad/security-log.service.js';

export interface MarcaView {
  color: string;
  pie: string;
  tieneLogo: boolean;
}

export interface MarcaChanges {
  color?: string;
  pie?: string;
  logo?: EncodedFileInput | null;
}

@Injectable()
export class MarcaService {
  public static readonly MAX_LOGO_BYTES = 512 * 1024;

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly log: SecurityLogService,
  ) {}

  public static normalizeColor(color: string): string {
    return `#${color.replace('#', '').toUpperCase()}`;
  }

  public async get(organizacionId: string): Promise<MarcaView> {
    const [row] = await this.db.select().from(organizacionMarca).where(eq(organizacionMarca.organizacionId, organizacionId)).limit(1);
    return { color: row?.color ?? '', pie: row?.pie ?? '', tieneLogo: row?.logo != null };
  }

  public async save(organizacionId: string, changes: MarcaChanges, actor: TokenPayload, ip: string | null = null): Promise<MarcaView> {
    const values: Partial<typeof organizacionMarca.$inferInsert> = { actualizadoEn: new Date() };
    if (changes.color !== undefined) values.color = MarcaService.normalizeColor(changes.color);
    if (changes.pie !== undefined) values.pie = changes.pie;
    if (changes.logo != null) {
      const data = EncodedFileReader.decode(changes.logo, MarcaService.MAX_LOGO_BYTES);
      const type = ImageKind.detect(data);
      if (type === undefined || ImageKind.size(data, type) === undefined) {
        throw new BadRequestException('El logotipo debe ser una imagen PNG o JPG válida.');
      }
      values.logo = data;
      values.logoTipo = type;
    }

    await this.db
      .insert(organizacionMarca)
      .values({ organizacionId, ...values })
      .onConflictDoUpdate({ target: organizacionMarca.organizacionId, set: values });
    await this.log.record({
      actorId: actor.sub,
      action: AuditActions.BRAND_UPDATED,
      metadata: { campos: Object.keys(changes).filter((key) => changes[key as keyof MarcaChanges] != null) },
      ip,
    });
    return this.get(organizacionId);
  }

  public async removeLogo(organizacionId: string, actor: TokenPayload, ip: string | null = null): Promise<MarcaView> {
    await this.db
      .update(organizacionMarca)
      .set({ logo: null, logoTipo: null, actualizadoEn: new Date() })
      .where(eq(organizacionMarca.organizacionId, organizacionId));
    await this.log.record({ actorId: actor.sub, action: AuditActions.BRAND_UPDATED, metadata: { campos: ['logo_quitado'] }, ip });
    return this.get(organizacionId);
  }

  public async forDocument(organizacionId: string): Promise<DocxBrand | undefined> {
    const [row] = await this.db.select().from(organizacionMarca).where(eq(organizacionMarca.organizacionId, organizacionId)).limit(1);
    if (!row) return undefined;

    const brand: DocxBrand = {};
    if (row.color) brand.color = row.color.replace('#', '');
    if (row.pie) brand.footer = row.pie;
    if (row.logo && (row.logoTipo === 'png' || row.logoTipo === 'jpg')) {
      const data = Buffer.from(row.logo);
      const size = ImageKind.size(data, row.logoTipo);
      if (size !== undefined && size.width > 0 && size.height > 0) {
        brand.logo = { data, type: row.logoTipo, width: size.width, height: size.height };
      }
    }
    return Object.keys(brand).length === 0 ? undefined : brand;
  }
}
