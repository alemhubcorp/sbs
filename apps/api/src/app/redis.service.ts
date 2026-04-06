import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { loadRuntimeConfig } from '@ruflo/config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor() {
    const config = loadRuntimeConfig();
    this.client = new Redis(config.redis.url, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 1_000
    });

    // Health probes may intentionally touch unavailable dependencies. Swallow
    // connection-level errors here so callers can degrade gracefully instead
    // of crashing the request pipeline.
    this.client.on('error', (error) => {
      console.warn('Redis probe error', error.message);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async checkHealth() {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
    const result = await this.client.ping();
    return result === 'PONG';
  }
}
