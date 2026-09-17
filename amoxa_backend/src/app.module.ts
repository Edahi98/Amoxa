import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DbModule } from '@db/db.module.js';
import { AuthModule } from '@auth/auth.module.js';

@Module({
  imports: [DbModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
