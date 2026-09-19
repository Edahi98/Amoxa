import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from '@auth/auth.controller.js';
import { AuthService } from '@auth/auth.service.js';
import { TokenService } from '@auth-token/token.service.js';
import { JwtAuthGuard } from '@auth-guards/jwt-auth.guard.js';
import { PermissionsGuard } from '@auth-guards-authorization/permissions.guard.js';
import { RoleExistsGuard } from '@auth-guards-authorization/role-exists.guard.js';
import { RolesGuard } from '@auth-guards-authorization/roles.guard.js';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '30m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, JwtAuthGuard, RoleExistsGuard, RolesGuard, PermissionsGuard],
  exports: [TokenService, JwtAuthGuard, RoleExistsGuard, RolesGuard, PermissionsGuard],
})
export class AuthModule {}
