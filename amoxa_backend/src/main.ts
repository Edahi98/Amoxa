import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { CorsOptions } from '@common-cors/cors-options.js';
import { BodyLimits } from '@common-http/body-limits.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: BodyLimits.JSON });
  app.useBodyParser('urlencoded', { limit: BodyLimits.URLENCODED, extended: true });
  app.enableCors(CorsOptions.build());
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
