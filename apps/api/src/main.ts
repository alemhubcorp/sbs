import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { randomUUID } from 'node:crypto';
import { AppModule } from './app/app.module.js';
import { AllExceptionsFilter } from './app/all-exceptions.filter.js';
import { loadRuntimeConfig } from '@ruflo/config';

async function bootstrap() {
  const config = loadRuntimeConfig();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true
    })
  );

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AllExceptionsFilter());
  const fastify = app.getHttpAdapter().getInstance();

  fastify.addHook('onRequest', async (request, reply) => {
    const existingHeader = request.headers['x-correlation-id'];
    const correlationId =
      (Array.isArray(existingHeader) ? existingHeader[0] : existingHeader) ?? request.id ?? randomUUID();
    request.headers['x-correlation-id'] = correlationId;
    reply.header('x-correlation-id', correlationId);
  });

  await app.listen(config.app.port, '0.0.0.0');
}

bootstrap().catch((error) => {
  console.error('Failed to start API', error);
  process.exitCode = 1;
});
