import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { NotificationService } from '@notificaciones/notification.service.js';
import { NotificationPresenter, type NotificationInbox } from '@notificaciones-bandeja/notification-presenter.js';
import { MarkReadSchema, type MarkReadInput } from '@validators-notificaciones/mark-read.schema.js';
import {
  NotificationListQuerySchema,
  type NotificationListQueryInput,
} from '@validators-notificaciones/notification-list-query.schema.js';

@Controller('notificaciones')
export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

  @Authorized.permissions('notificacion.leer')
  @Get()
  public async list(
    @Req() request: Request,
    @Query(new ZodValidationPipe(NotificationListQuerySchema)) query: NotificationListQueryInput,
  ): Promise<NotificationInbox> {
    const rows = await this.notifications.listFor(request.user!.sub, query.soloNoLeidas === true);
    return NotificationPresenter.inbox(rows);
  }

  @Authorized.permissions('notificacion.leer')
  @HttpCode(HttpStatus.OK)
  @Post('leidas')
  public async markRead(
    @Req() request: Request,
    @Body(new ZodValidationPipe(MarkReadSchema)) body: MarkReadInput,
  ): Promise<{ marcadas: number }> {
    return { marcadas: await this.notifications.markRead(request.user!.sub, body.ids) };
  }
}
