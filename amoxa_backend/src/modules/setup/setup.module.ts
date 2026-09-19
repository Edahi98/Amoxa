import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SeguridadModule } from '@seguridad/seguridad.module.js';
import { SetupController } from '@setup-controllers/setup.controller.js';
import { SetupLockGuard } from '@setup-guards/setup-lock.guard.js';
import { ActivationService } from '@setup-services/activation.service.js';
import { BootstrapTokenService } from '@setup-services/bootstrap-token.service.js';
import { InitializationService } from '@setup-services/initialization.service.js';

@Module({
  imports: [SeguridadModule],
  controllers: [SetupController],
  providers: [
    InitializationService,
    BootstrapTokenService,
    ActivationService,
    { provide: APP_GUARD, useClass: SetupLockGuard },
  ],
})
export class SetupModule {}
