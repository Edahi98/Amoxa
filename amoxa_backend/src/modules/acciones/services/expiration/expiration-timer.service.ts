import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ExpirationAlertService } from '@acciones-services-expiration/expiration-alert.service.js';

@Injectable()
export class ExpirationTimerService implements OnApplicationBootstrap, OnApplicationShutdown {
  public static readonly INTERVAL_MS = 3_600_000;

  private readonly logger = new Logger(ExpirationTimerService.name);
  private handle: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly alerts: ExpirationAlertService) {}

  onApplicationBootstrap(): void {
    this.handle = setInterval(() => void this.tick(), ExpirationTimerService.INTERVAL_MS);
    this.handle.unref();
  }

  onApplicationShutdown(): void {
    if (this.handle !== undefined) {
      clearInterval(this.handle);
      this.handle = undefined;
    }
  }

  private async tick(): Promise<void> {
    try {
      await this.alerts.run(new Date());
    } catch (error) {
      this.logger.error('No se pudieron procesar las alertas de vencimiento', error instanceof Error ? error.stack : undefined);
    }
  }
}
