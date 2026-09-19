import { Global, Module } from '@nestjs/common';
import { ThrottleGuard } from '@common-throttle/throttle.guard.js';
import { ThrottleStore } from '@common-throttle/throttle-store.js';

@Global()
@Module({
  providers: [ThrottleStore, ThrottleGuard],
  exports: [ThrottleStore, ThrottleGuard],
})
export class ThrottleModule {}
