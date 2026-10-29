import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Front et API sur la même origine (/api relayé par le front) : pas de CORS.
  app.set('trust proxy', 1);
  // WebSockets (`ws`) sur le même port que l'API : la table pousse les tours et les mises en direct.
  app.useWebSocketAdapter(new WsAdapter(app));
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000, process.env.HOST ?? '0.0.0.0');
}
await bootstrap();
