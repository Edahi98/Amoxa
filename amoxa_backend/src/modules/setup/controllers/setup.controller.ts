import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { ThrottleDecorator } from '@common-throttle/throttle.decorator.js';
import { ThrottleGuard } from '@common-throttle/throttle.guard.js';
import { SetupSchema, type SetupInput } from '@validators-setup/setup.schema.js';
import { ActivationService, type ActivatedSuperuser } from '@setup-services/activation.service.js';
import { InitializationService } from '@setup-services/initialization.service.js';

@Controller('setup')
export class SetupController {
  constructor(
    private readonly initialization: InitializationService,
    private readonly activation: ActivationService,
  ) {}

  @Get('status')
  public async status(): Promise<{ initialized: boolean }> {
    return { initialized: await this.initialization.isInitialized() };
  }

  @Post()
  @UseGuards(ThrottleGuard)
  @ThrottleDecorator.of({ limit: 5, windowMs: 15 * 60 * 1000 })
  public async activate(
    @Body(new ZodValidationPipe(SetupSchema)) body: SetupInput,
    @Req() request: Request,
  ): Promise<ActivatedSuperuser> {
    return this.activation.activate(body, request.ip ?? null);
  }
}
