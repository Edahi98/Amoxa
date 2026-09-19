import { Injectable } from '@nestjs/common';
import { ROLES } from '@shared/roles.js';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { UsuarioQueryService } from '@usuarios-services-usuario/usuario-query.service.js';
import type { UsuarioView } from '@usuarios-services-usuario/usuario-view.js';

@Injectable()
@ScreenDataDecorator.of('usuario.lista', 'usuario.crear', 'usuario.editar', 'perfil.editar')
export class UsuarioScreenProvider extends ScreenDataProvider {
  private static readonly LIST_LIMIT = 100;

  constructor(private readonly query: UsuarioQueryService) {
    super();
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    switch (request.screenId) {
      case 'usuario.lista':
        return this.list();
      case 'usuario.crear':
        return { data: { nuevo: { nombre: '', email: '', rol: '' }, invitacion: { url: '', expiresAt: '' } } };
      case 'usuario.editar':
        return this.edit(request);
      default:
        return this.profile(request);
    }
  }

  private async list(): Promise<ScreenData> {
    const page = await this.query.list({ page: 1, limit: UsuarioScreenProvider.LIST_LIMIT });
    const summary =
      page.total > page.items.length
        ? `Mostrando ${page.items.length} de ${page.total} usuarios.`
        : `${page.total} ${page.total === 1 ? 'usuario' : 'usuarios'}.`;
    return {
      data: {
        resumen: summary,
        usuarios: page.items.map((item) => ({
          id: item.id,
          nombre: item.nombre,
          email: item.email,
          rol: ROLES[item.rol].label,
          estado: UsuarioScreenProvider.stateOf(item),
          ultimoAcceso: item.ultimoAccesoEn?.toISOString() ?? null,
        })),
      },
    };
  }

  private async edit(request: ScreenDataRequest): Promise<ScreenData> {
    if (request.entityId === undefined) {
      return { data: { usuario: { nombre: '', email: '', rol: '', activo: true, passwordDefinida: true }, invitacion: { url: '', expiresAt: '' } } };
    }
    const usuario = await this.query.get(request.entityId);
    return {
      entity: { type: 'usuario', id: usuario.id, version: 1 },
      data: { usuario, invitacion: { url: '', expiresAt: '' } },
    };
  }

  private async profile(request: ScreenDataRequest): Promise<ScreenData> {
    const usuario = await this.query.get(request.user.sub);
    return {
      entity: { type: 'usuario', id: usuario.id, version: 1 },
      data: { perfil: { nombre: usuario.nombre, email: usuario.email }, clave: { actual: '', nueva: '' } },
    };
  }

  private static stateOf(item: UsuarioView): string {
    if (!item.passwordDefinida && !item.activo) return 'Invitación pendiente';
    return item.activo ? 'Activo' : 'Inactivo';
  }
}
