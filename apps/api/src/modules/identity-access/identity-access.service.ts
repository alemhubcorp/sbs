import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { RequestAuditContext } from '../../app/auth-context.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { IdentityAccessRepository } from './identity-access.repository.js';

const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  externalSubject: z.string().min(1).max(255).optional(),
  roleIds: z.array(z.string().min(1)).default([])
});

const createRoleSchema = z.object({
  code: z.string().min(2).max(64).regex(/^[a-z0-9_.-]+$/),
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(500).optional()
});

const createPermissionSchema = z.object({
  code: z.string().min(2).max(64).regex(/^[a-z0-9_.-]+$/),
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(500).optional()
});

const assignRolesSchema = z.object({
  roleIds: z.array(z.string().min(1)).min(1)
});

const syncRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().min(1))
});

@Injectable()
export class IdentityAccessService {
  constructor(
    @Inject(IdentityAccessRepository)
    private readonly identityAccessRepository: IdentityAccessRepository,
    @Inject(AuditService)
    private readonly auditService: AuditService
  ) {}

  listUsers() {
    return this.identityAccessRepository.listUsers();
  }

  getUserById(id: string) {
    return this.identityAccessRepository.getUserById(id);
  }

  async createUser(input: unknown, auditContext: RequestAuditContext) {
    const user = await this.identityAccessRepository.createUser(createUserSchema.parse(input));

    await this.auditService.record({
      module: 'identity-access',
      eventType: 'identity.user.created',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'user',
      subjectId: user.id,
      payload: {
        email: user.email,
        roleIds: user.userRoles.map((entry) => entry.roleId)
      }
    });

    return user;
  }

  listRoles() {
    return this.identityAccessRepository.listRoles();
  }

  async createRole(input: unknown, auditContext: RequestAuditContext) {
    const role = await this.identityAccessRepository.createRole(createRoleSchema.parse(input));

    await this.auditService.record({
      module: 'identity-access',
      eventType: 'identity.role.created',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'role',
      subjectId: role.id,
      payload: {
        code: role.code,
        name: role.name
      }
    });

    return role;
  }

  listPermissions() {
    return this.identityAccessRepository.listPermissions();
  }

  async createPermission(input: unknown, auditContext: RequestAuditContext) {
    const permission = await this.identityAccessRepository.createPermission(createPermissionSchema.parse(input));

    await this.auditService.record({
      module: 'identity-access',
      eventType: 'identity.permission.created',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'permission',
      subjectId: permission.id,
      payload: {
        code: permission.code,
        name: permission.name
      }
    });

    return permission;
  }

  async assignRoles(userId: string, input: unknown, auditContext: RequestAuditContext) {
    const { roleIds } = assignRolesSchema.parse(input);
    const user = await this.identityAccessRepository.assignRoles(userId, roleIds);

    await this.auditService.record({
      module: 'identity-access',
      eventType: 'identity.user.roles.assigned',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'user',
      subjectId: user.id,
      payload: {
        roleIds
      }
    });

    return user;
  }

  async syncRolePermissions(roleId: string, input: unknown, auditContext: RequestAuditContext) {
    const { permissionIds } = syncRolePermissionsSchema.parse(input);
    const role = await this.identityAccessRepository.syncRolePermissions(roleId, permissionIds);

    await this.auditService.record({
      module: 'identity-access',
      eventType: 'identity.role.permissions.synced',
      actorId: auditContext.actorId,
      tenantId: auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'role',
      subjectId: role.id,
      payload: {
        permissionIds
      }
    });

    return role;
  }
}
