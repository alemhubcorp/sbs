import { Controller, Get, HttpCode } from '@nestjs/common';
import { loadRuntimeConfig } from '@ruflo/config';
import { createPrismaClient } from '@ruflo/database';
import { Redis } from 'ioredis';
import { Public } from './public.decorator.js';

type DependencyState = 'up' | 'down' | 'degraded';

interface DependencyHealth {
  status: DependencyState;
  latencyMs?: number;
  target?: string;
  error?: string;
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'unknown_error';
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        reject(new Error(`timeout_after_${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
}

async function probeHttp(url: string, timeoutMs = 2_000): Promise<DependencyHealth> {
  const startedAt = Date.now();

  try {
    const response = await withTimeout(fetch(url), timeoutMs);
    const result: DependencyHealth = {
      status: response.ok ? 'up' : 'down',
      latencyMs: Date.now() - startedAt,
      target: url
    };

    if (!response.ok) {
      result.error = `http_${response.status}`;
    }

    return result;
  } catch (error) {
    return {
      status: 'down',
      latencyMs: Date.now() - startedAt,
      target: url,
      error: normalizeError(error)
    };
  }
}

async function probeCheck(
  target: string,
  check: () => Promise<boolean>,
  timeoutMs = 2_000
): Promise<DependencyHealth> {
  const startedAt = Date.now();

  try {
    const healthy = await withTimeout(check(), timeoutMs);

    return {
      status: healthy ? 'up' : 'degraded',
      latencyMs: Date.now() - startedAt,
      target
    };
  } catch (error) {
    return {
      status: 'down',
      latencyMs: Date.now() - startedAt,
      target,
      error: normalizeError(error)
    };
  }
}

async function probePostgres(databaseUrl: string): Promise<DependencyHealth> {
  const client = createPrismaClient();

  try {
    await client.$connect();
    return await probeCheck(databaseUrl, async () => {
      await client.$queryRawUnsafe('SELECT 1');
      return true;
    });
  } finally {
    await client.$disconnect();
  }
}

async function probeRedis(redisUrl: string): Promise<DependencyHealth> {
  const startedAt = Date.now();
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: 1_000
  });

  client.on('error', () => {
    // Swallow connection-level errors so the health route can degrade gracefully.
  });

  try {
    await client.connect();
    const result = await withTimeout(client.ping(), 2_000);

    return {
      status: result === 'PONG' ? 'up' : 'degraded',
      latencyMs: Date.now() - startedAt,
      target: redisUrl
    };
  } catch (error) {
    return {
      status: 'down',
      latencyMs: Date.now() - startedAt,
      target: redisUrl,
      error: normalizeError(error)
    };
  } finally {
    await client.quit().catch(() => undefined);
  }
}

@Controller('health')
export class HealthController {
  private async collectDependencyHealth() {
    const config = loadRuntimeConfig();
    return {
      postgres: await probePostgres(config.database.url),
      redis: await probeRedis(config.redis.url),
      minio: await probeHttp(config.storage.url + '/minio/health/live'),
      meilisearch: await probeHttp(`${config.search.url}/health`, 5_000),
      keycloak: await probeHttp(`http://${config.auth.keycloakHost}:${config.auth.keycloakPort}/realms/master`)
    };
  }

  @Get()
  @Public()
  @HttpCode(200)
  async check() {
    const app = {
      status: 'up' as const,
      service: 'ruflo-api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime())
    };

    try {
      const dependencies = await this.collectDependencyHealth();

      return {
        status: Object.values(dependencies).every((dependency) => dependency.status === 'up')
          ? 'ok'
          : 'degraded',
        app,
        dependencies
      };
    } catch (error) {
      return {
        status: 'degraded',
        app,
        dependencies: {
          postgres: { status: 'degraded', error: 'probe_handler_failed' },
          redis: { status: 'degraded', error: 'probe_handler_failed' },
          minio: { status: 'degraded', error: 'probe_handler_failed' },
          meilisearch: { status: 'degraded', error: 'probe_handler_failed' },
          keycloak: { status: 'degraded', error: normalizeError(error) }
        }
      };
    }
  }

  @Get('readiness')
  @Public()
  @HttpCode(200)
  async readiness() {
    const app = {
      status: 'up' as const,
      service: 'ruflo-api',
      timestamp: new Date().toISOString()
    };

    try {
      const dependencies = await this.collectDependencyHealth();
      const ready = Object.values(dependencies).every((dependency) => dependency.status !== 'down');

      return {
        status: ready ? 'ready' : 'degraded',
        app,
        dependencies
      };
    } catch (error) {
      return {
        status: 'degraded',
        app,
        error: normalizeError(error)
      };
    }
  }

  @Get('status')
  @Public()
  @HttpCode(200)
  async status() {
    return {
      status: 'ok',
      app: {
        status: 'up',
        service: 'ruflo-api',
        timestamp: new Date().toISOString()
      }
    };
  }
}
