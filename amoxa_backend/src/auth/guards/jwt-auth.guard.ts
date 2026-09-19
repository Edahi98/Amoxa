import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { BearerToken } from '@auth-token/bearer-token.js';
import { TokenService } from '@auth-token/token.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawToken = BearerToken.from(request);
    if (!rawToken) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    request.user = await this.tokenService.validate(rawToken);
    return true;
  }
}
