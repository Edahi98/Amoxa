import { Injectable } from '@nestjs/common';
import { ScreenDataProvider } from '@sdui-data/screen-data-provider.js';
import { ScreenDataDecorator } from '@sdui-data/screen-data.decorator.js';
import type { ScreenData, ScreenDataRequest } from '@sdui-data/screen-data.types.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { NotificationPresenter } from '@notificaciones-bandeja/notification-presenter.js';

@Injectable()
@ScreenDataDecorator.of('notificaciones')
export class NotificationsDataProvider extends ScreenDataProvider {
  constructor(private readonly notifications: NotificationService) {
    super();
  }

  public async load(request: ScreenDataRequest): Promise<ScreenData> {
    const rows = await this.notifications.listFor(request.user.sub);
    return { data: { ...NotificationPresenter.inbox(rows) }, offline: { enabled: false } };
  }
}
