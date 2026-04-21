import { Module } from '@nestjs/common';
import { AdminOpsNestModule } from '../admin-ops/admin-ops.nest-module.js';
import { AiPlatformService } from './ai-platform.service.js';

@Module({
  imports: [AdminOpsNestModule],
  providers: [AiPlatformService],
  exports: [AiPlatformService]
})
export class AiPlatformNestModule {}
