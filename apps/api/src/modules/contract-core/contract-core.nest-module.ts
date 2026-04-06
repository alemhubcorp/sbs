import { Module } from '@nestjs/common';
import { ContractCoreController } from './contract-core.controller.js';
import { ContractCoreRepository } from './contract-core.repository.js';
import { ContractCoreService } from './contract-core.service.js';

@Module({
  controllers: [ContractCoreController],
  providers: [ContractCoreRepository, ContractCoreService],
  exports: [ContractCoreService]
})
export class ContractCoreNestModule {}
