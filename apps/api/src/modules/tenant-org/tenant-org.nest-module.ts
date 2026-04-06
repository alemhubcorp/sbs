import { Module } from '@nestjs/common';
import { TenantOrgController } from './tenant-org.controller.js';
import { TenantOrgRepository } from './tenant-org.repository.js';
import { TenantOrgService } from './tenant-org.service.js';

@Module({
  controllers: [TenantOrgController],
  providers: [TenantOrgRepository, TenantOrgService]
})
export class TenantOrgNestModule {}
