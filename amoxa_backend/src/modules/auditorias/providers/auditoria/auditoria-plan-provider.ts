import { Injectable } from '@nestjs/common';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { AuditScreenBlocks } from '@auditorias-providers/audit-screen-blocks.js';
import { AuditoriaScreenProvider } from '@auditorias-providers-auditoria/auditoria-screen-provider.js';

@ScreenDataDecorator.of('auditoria.plan')
@Injectable()
export class AuditoriaPlanProvider extends AuditoriaScreenProvider {
  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    return this.build(request, (detalle) => ({
      auditoria: AuditScreenBlocks.auditoria(detalle),
      plan: AuditScreenBlocks.plan(detalle),
    }));
  }
}
