import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '@db/db.module.js';
import type { Db } from '@db/client.js';
import { usuario } from '@schemas/index.js';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { AdminCountsQuery } from '@seguimiento-acceso/admin-counts.query.js';
import { ActivityFeedQuery } from '@seguimiento-acceso/activity-feed.query.js';
import { HomeCountsQuery } from '@seguimiento-acceso/home-counts.query.js';

@Injectable()
@ScreenDataDecorator.of('inicio')
export class InicioDataProvider extends ScreenDataProvider {
  constructor(
    private readonly counts: HomeCountsQuery,
    private readonly adminCounts: AdminCountsQuery,
    private readonly feed: ActivityFeedQuery,
    @Inject(DB) private readonly db: Db,
  ) {
    super();
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    const isAdmin = request.role === 'superusuario' || request.role === 'administrador';
    const conteos = isAdmin
      ? await this.adminCounts.load(request.user, request.role)
      : await this.counts.load(request.user, request.role);
    const feed = await this.feed.load(request.user, request.role);
    const [persona] = await this.db.select({ nombre: usuario.nombre }).from(usuario).where(eq(usuario.id, request.user.sub)).limit(1);
    return { data: { conteos, ...feed, user: { nombre: persona?.nombre ?? request.user.email } }, offline: { enabled: false } };
  }
}
