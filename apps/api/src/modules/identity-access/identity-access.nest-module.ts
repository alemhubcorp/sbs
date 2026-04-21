import { Module } from '@nestjs/common';
import { AdminOpsNestModule } from '../admin-ops/admin-ops.nest-module.js';
import { NotificationsCoreNestModule } from '../notifications-core/notifications-core.nest-module.js';
import { IdentityAccessController } from './identity-access.controller.js';
import { IdentityAccessRepository } from './identity-access.repository.js';
import { IdentityAccessService } from './identity-access.service.js';

@Module({
  imports: [NotificationsCoreNestModule, AdminOpsNestModule],
  controllers: [IdentityAccessController],
  providers: [IdentityAccessRepository, IdentityAccessService]
})
export class IdentityAccessNestModule {}
