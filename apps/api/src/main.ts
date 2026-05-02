import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { randomUUID } from 'node:crypto';
import { AppModule } from './app/app.module.js';
import { AllExceptionsFilter } from './app/all-exceptions.filter.js';
import { loadRuntimeConfig } from '@ruflo/config';

async function bootstrap() {
  const config = loadRuntimeConfig();
  const allowedOrigins = [
    ...[config.auth.adminAppUrl, config.auth.webAppUrl].map((url) => new URL(url).origin),
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3002'
  ];
  const allowedOriginSet = new Set(allowedOrigins);
  const allowedHeaders = 'Authorization, Content-Type, X-Correlation-Id';
  const allowedMethods = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';

  const adapter = new FastifyAdapter({
    logger: true
  });
  const adapterInstance = adapter.getInstance();
  adapterInstance.removeContentTypeParser('application/json');
  adapterInstance.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
    const rawBody = typeof body === 'string' ? body : body.toString('utf8');
    (request as unknown as { rawBody: string }).rawBody = rawBody;

    try {
      done(null, rawBody ? JSON.parse(rawBody) : {});
    } catch (error) {
      done(error as Error, undefined);
    }
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter
  );

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Correlation-Id'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  const fastify = app.getHttpAdapter().getInstance();

  fastify.addHook('onRequest', async (request, reply) => {
    const existingHeader = request.headers['x-correlation-id'];
    const correlationId =
      (Array.isArray(existingHeader) ? existingHeader[0] : existingHeader) ?? request.id ?? randomUUID();
    request.headers['x-correlation-id'] = correlationId;
    reply.header('x-correlation-id', correlationId);
  });

  fastify.options('/api/*', async (request, reply) => {
    const origin = request.headers.origin;

    if (typeof origin === 'string' && allowedOriginSet.has(origin)) {
      reply.header('access-control-allow-origin', origin);
      reply.header('access-control-allow-credentials', 'true');
      reply.header('access-control-allow-methods', allowedMethods);
      reply.header('access-control-allow-headers', allowedHeaders);
      reply.header('vary', 'Origin');
    }

    reply.code(204).send();
  });

  fastify.addHook('onSend', async (request, reply, payload) => {
    const origin = request.headers.origin;

    if (typeof origin === 'string' && allowedOriginSet.has(origin)) {
      reply.header('access-control-allow-origin', origin);
      reply.header('access-control-allow-credentials', 'true');
      reply.header('access-control-allow-methods', allowedMethods);
      reply.header('access-control-allow-headers', allowedHeaders);
      reply.header('vary', 'Origin');
    }

    return payload;
  });

  await app.listen(config.app.port, '0.0.0.0');
}

bootstrap().catch((error) => {
  console.error('Failed to start API', error);
  process.exitCode = 1;
});
