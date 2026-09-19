import { Module } from '@nestjs/common';
import { AuthModule } from '@auth/auth.module.js';
import { ScreenDataService } from '@sdui-data/screen-data.service.js';
import { ScreenAccessGuard } from '@sdui-guards/screen-access.guard.js';
import { SduiController } from '@sdui/sdui.controller.js';
import '@screens/index.js';

@Module({
  imports: [AuthModule],
  controllers: [SduiController],
  providers: [ScreenAccessGuard, ScreenDataService],
})
export class SduiModule {}
