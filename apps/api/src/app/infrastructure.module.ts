import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthorizationGuard } from './authorization.guard.js';
import { AuthorizationContextService } from './authorization-context.service.js';
import { PrismaService } from './prisma.service.js';
import { QueueService } from './queue.service.js';
import { RedisService } from './redis.service.js';
import { ConfigModule } from '@nestjs/config';
import { AuthContextGuard } from './auth-context.guard.js';
import { ApprovalService } from './approval.service.js';
import { ApprovalPolicyService } from './approval-policy.service.js';
import { BootstrapService } from './bootstrap.service.js';
import { KeycloakJwtService } from './keycloak-jwt.service.js';
import { ResourceAccessService } from './resource-access.service.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    PrismaService,
    QueueService,
    RedisService,
    KeycloakJwtService,
    AuthorizationContextService,
    ApprovalService,
    ApprovalPolicyService,
    BootstrapService,
    ResourceAccessService,
    {
      provide: APP_GUARD,
      useClass: AuthContextGuard
    },
    {
      provide: APP_GUARD,
      useClass: AuthorizationGuard
    }
  ],
  exports: [
    PrismaService,
    QueueService,
    RedisService,
    KeycloakJwtService,
    ApprovalService,
    ApprovalPolicyService,
    ResourceAccessService
  ]
})
export class InfrastructureModule {}
