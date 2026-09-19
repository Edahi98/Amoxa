import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { TokenPayload } from '@auth-token/token-payload.js';

export class RequestUser {
  public static of(request: Request): TokenPayload {
    if (request.user === undefined) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
    return request.user;
  }
}
