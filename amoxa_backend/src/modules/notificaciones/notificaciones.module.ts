import { Module } from '@nestjs/common';
import { AuthModule } from '@auth/auth.module.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { NotificationsController } from '@notificaciones-bandeja-notifications/notifications.controller.js';
import { NotificationsDataProvider } from '@notificaciones-bandeja-notifications/notifications-data.provider.js';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationService, NotificationsDataProvider],
  exports: [NotificationService],
})
export class NotificacionesModule {}
