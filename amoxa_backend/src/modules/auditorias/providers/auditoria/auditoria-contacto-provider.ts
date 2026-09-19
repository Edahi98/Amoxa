import { Injectable } from '@nestjs/common';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { AuditScreenBlocks } from '@auditorias-providers/audit-screen-blocks.js';
import { AuditoriaScreenProvider } from '@auditorias-providers-auditoria/auditoria-screen-provider.js';

@ScreenDataDecorator.of('auditoria.contacto')
@Injectable()
export class AuditoriaContactoProvider extends AuditoriaScreenProvider {
  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    return this.build(request, (detalle) => ({
      auditoria: AuditScreenBlocks.auditoria(detalle),
      contacto: {
        informacion_suficiente: detalle.contacto?.informacionSuficiente ?? false,
        cooperacion: detalle.contacto?.cooperacion ?? false,
        tiempo: detalle.contacto?.tiempo ?? false,
        observaciones: detalle.contacto?.observaciones ?? '',
        confirmado: detalle.viabilidadOk,
        respuesta: detalle.contacto?.respuestaArea ?? '',
        respuesta_en: detalle.contacto?.respondidoEn?.toISOString() ?? '',
      },
    }));
  }
}
