import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { CorsOptions } from '@common-cors/cors-options.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(CorsOptions.build());
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
