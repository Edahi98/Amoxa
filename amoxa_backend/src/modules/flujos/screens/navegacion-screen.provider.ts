import { Injectable } from '@nestjs/common';
import { NavGate } from '@shared-workflow/nav-gate.js';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { FlujoInstanceService } from '@flujos-services-flujo/flujo-instance.service.js';
import { MenuBloqueoService } from '@flujos-services-flujo/menu-bloqueo.service.js';

@Injectable()
@ScreenDataDecorator.of('shell.navegacion')
export class NavegacionScreenProvider extends ScreenDataProvider {
  constructor(
    private readonly instances: FlujoInstanceService,
    private readonly menu: MenuBloqueoService,
  ) {
    super();
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    const locked = request.role === 'superusuario' ? await this.menu.isLocked(request.user.sub) : true;
    const current = locked ? await this.currentStep(request) : Number.MAX_SAFE_INTEGER;
    return { data: { nav: NavGate.states(NavGate.allScreens(), current), menu: { bloqueo: locked } }, offline: { enabled: false } };
  }

  private async currentStep(request: ScreenDataRequest): Promise<number> {
    const views = await this.instances.list(request.user, request.role);
    const newest = views.find(({ progress }) => progress.state !== 'cancelado');
    if (newest === undefined) return 0;
    if (newest.progress.state === 'concluido') return Number.MAX_SAFE_INTEGER;
    const index = newest.progress.steps.findIndex((step) => step.id === newest.progress.currentStepId);
    return Math.max(index, 0);
  }
}
