import { Controller, Get, NotFoundException, Param, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '@auth-guards/jwt-auth.guard.js';
import { RoleExistsGuard } from '@auth-guards-authorization/role-exists.guard.js';
import { ScreenAccessGuard } from '@sdui-guards/screen-access.guard.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { SduiScreenIdSchema, SduiScreenQuerySchema } from '@validators/sdui-screen.schema.js';
import type { SduiScreenQuery } from '@validators/sdui-screen.schema.js';
import { RoleMapper } from '@auth-roles/role-mapper.js';
import type { RawScreen } from '@sdui-builder/raw-json.types.js';
import { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import { ScreenDataService } from '@sdui-data/screen-data.service.js';
import { ScreenFactory } from '@sdui-definition-screen/screen-factory.js';
import { ScreenRegistry } from '@sdui-registry/screen-registry.js';

@Controller('sdui')
export class SduiController {
  constructor(private readonly screenData: ScreenDataService) {}

  @UseGuards(JwtAuthGuard, RoleExistsGuard, ScreenAccessGuard)
  @Get('screens/:screenId')
  public async getScreen(
    @Param('screenId', new ZodValidationPipe(SduiScreenIdSchema)) screenId: string,
    @Query(new ZodValidationPipe(SduiScreenQuerySchema)) query: SduiScreenQuery,
    @Req() request: Request,
  ): Promise<RawScreen> {
    if (request.user === undefined) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const definitionClass = ScreenRegistry.findByScreenId(screenId);
    if (definitionClass === undefined) {
      throw new NotFoundException('Pantalla no encontrada');
    }

    const rawUser = RoleMapper.toRawUser(request.user);
    const context = ScreenContextBuilder.forUser(rawUser);
    if (query.entityId !== undefined) {
      context.entity({ type: query.entityType ?? 'entidad', id: query.entityId, version: 1 });
    }

    const loaded = await this.screenData.load({
      screenId,
      user: request.user,
      role: rawUser.rol,
      entityId: query.entityId,
      entityType: query.entityType,
    });
    if (loaded.entity !== undefined) context.entity(loaded.entity);
    if (loaded.data !== undefined) context.data(loaded.data);
    if (loaded.offline !== undefined) context.offline(loaded.offline);

    return ScreenFactory.create(definitionClass, context);
  }
}
