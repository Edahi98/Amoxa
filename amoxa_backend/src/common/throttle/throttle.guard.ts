import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ThrottleMetadata } from '@common-throttle/throttle-metadata.js';
import type { ThrottleOptions } from '@common-throttle/throttle-options.js';
import { ThrottleStore } from '@common-throttle/throttle-store.js';

@Injectable()
export class ThrottleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly store: ThrottleStore,
  ) {}

  public canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<ThrottleOptions | undefined>(ThrottleMetadata.KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (options === undefined) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const key = `${request.ip ?? 'desconocida'}:${context.getClass().name}:${context.getHandler().name}`;
    if (!this.store.hit(key, options.limit, options.windowMs)) {
      throw new HttpException('Demasiadas solicitudes', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
