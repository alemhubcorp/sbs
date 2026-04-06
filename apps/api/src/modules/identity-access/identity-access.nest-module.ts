import { Module } from '@nestjs/common';
import { IdentityAccessController } from './identity-access.controller.js';
import { IdentityAccessRepository } from './identity-access.repository.js';
import { IdentityAccessService } from './identity-access.service.js';

@Module({
  controllers: [IdentityAccessController],
  providers: [IdentityAccessRepository, IdentityAccessService]
})
export class IdentityAccessNestModule {}
