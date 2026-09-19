import { Module } from '@nestjs/common';
import { SecurityLogService } from '@seguridad/security-log.service.js';

@Module({
  providers: [SecurityLogService],
  exports: [SecurityLogService],
})
export class SeguridadModule {}
