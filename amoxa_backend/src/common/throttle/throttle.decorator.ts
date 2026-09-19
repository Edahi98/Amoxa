import { SetMetadata } from '@nestjs/common';
import { ThrottleMetadata } from '@common-throttle/throttle-metadata.js';
import type { ThrottleOptions } from '@common-throttle/throttle-options.js';

export class ThrottleDecorator {
  public static of(options: ThrottleOptions) {
    return SetMetadata(ThrottleMetadata.KEY, options);
  }
}
