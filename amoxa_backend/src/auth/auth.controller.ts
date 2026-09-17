import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '@auth/auth.service.js';
import { JwtAuthGuard } from '@auth-guards/jwt-auth.guard.js';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe.js';
import { RegisterSchema } from '@validators/register.schema.js';
import type { RegisterInput } from '@validators/register.schema.js';
import { LoginSchema } from '@validators/login.schema.js';
import type { LoginInput } from '@validators/login.schema.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterInput) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body(new ZodValidationPipe(LoginSchema)) dto: LoginInput) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() request: Request) {
    return request.user;
  }
}
