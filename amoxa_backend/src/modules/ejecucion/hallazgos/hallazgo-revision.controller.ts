import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Authorized } from '@auth-decorators/authorized.decorator.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { RevisarHallazgoSchema, type RevisarHallazgoInput } from '@validators-ejecucion/revisar-hallazgo.schema.js';
import { UuidParamSchema } from '@validators-ejecucion/uuid-param.schema.js';
import { RequestUser } from '@ejecucion-acceso/request-user.js';
import { HallazgoService } from '@ejecucion-hallazgos/hallazgo.service.js';
import type { HallazgoView } from '@ejecucion-hallazgos/hallazgo-view.js';

@Controller('hallazgos')
export class HallazgoRevisionController {
  constructor(private readonly hallazgos: HallazgoService) {}

  @Post(':id/revision')
  @Authorized.permissions('hallazgo.revisar')
  public async revisar(
    @Param('id', new ZodValidationPipe(UuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(RevisarHallazgoSchema)) body: RevisarHallazgoInput,
    @Req() request: Request,
  ): Promise<HallazgoView> {
    return this.hallazgos.review(id, RequestUser.of(request), body);
  }
}
