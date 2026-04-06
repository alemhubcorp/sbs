import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { loadRuntimeConfig } from '@ruflo/config';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection: Redis;
  private queue?: Queue;

  constructor() {
    const config = loadRuntimeConfig();
    this.connection = new Redis(config.redis.url, {
      maxRetriesPerRequest: null,
      lazyConnect: true
    });

    this.connection.on('error', (error) => {
      console.warn('Queue Redis connection error', error.message);
    });
  }

  private getQueue() {
    if (!this.queue) {
      this.queue = new Queue('system', { connection: this.connection });
    }

    return this.queue;
  }

  async enqueueDemoJob() {
    return this.getQueue().add('demo-job', {
      queuedAt: new Date().toISOString()
    });
  }

  async onModuleDestroy() {
    await this.queue?.close();
    await this.connection.quit();
  }
}
