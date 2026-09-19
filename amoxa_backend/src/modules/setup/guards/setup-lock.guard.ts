import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { Request } from 'express';
import { InitializationService } from '@setup-services/initialization.service.js';

@Injectable()
export class SetupLockGuard implements CanActivate {
  private static readonly SETUP_PREFIX = '/setup';

  constructor(private readonly initialization: InitializationService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (SetupLockGuard.isSetupPath(request.path)) {
      return true;
    }
    if (!(await this.initialization.isInitialized())) {
      throw new ServiceUnavailableException('Sistema no inicializado');
    }
    return true;
  }

  private static isSetupPath(path: string): boolean {
    return path === SetupLockGuard.SETUP_PREFIX || path.startsWith(`${SetupLockGuard.SETUP_PREFIX}/`);
  }
}
