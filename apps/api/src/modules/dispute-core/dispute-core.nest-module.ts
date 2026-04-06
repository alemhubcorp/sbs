import { Module } from '@nestjs/common';
import { DisputeCoreController } from './dispute-core.controller.js';
import { DisputeCoreRepository } from './dispute-core.repository.js';
import { DisputeCoreService } from './dispute-core.service.js';

@Module({
  controllers: [DisputeCoreController],
  providers: [DisputeCoreRepository, DisputeCoreService]
})
export class DisputeCoreNestModule {}
