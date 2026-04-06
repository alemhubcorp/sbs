import { Module } from '@nestjs/common';
import { WholesaleCoreController } from './wholesale-core.controller.js';
import { WholesaleCoreRepository } from './wholesale-core.repository.js';
import { WholesaleCoreService } from './wholesale-core.service.js';

@Module({
  controllers: [WholesaleCoreController],
  providers: [WholesaleCoreRepository, WholesaleCoreService],
  exports: [WholesaleCoreService]
})
export class WholesaleCoreNestModule {}
