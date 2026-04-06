import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createPrismaClient } from '@ruflo/database';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client = createPrismaClient();

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }

  async checkHealth() {
    await this.client.$queryRawUnsafe('SELECT 1');
    return true;
  }
}
