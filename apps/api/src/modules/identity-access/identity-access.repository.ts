import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../app/prisma.service.js';

export interface CreateUserRecordInput {
  email: string;
  firstName: string;
  lastName: string;
  externalSubject?: string | undefined;
  roleIds: string[];
  status?: 'invited' | 'active' | 'disabled';
}

export interface CreateRoleRecordInput {
  code: string;
  name: string;
  description?: string | undefined;
}

export interface CreatePermissionRecordInput {
  code: string;
  name: string;
  description?: string | undefined;
}

@Injectable()
export class IdentityAccessRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listUsers() {
    return this.prismaService.client.user.findMany({
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getUserById(id: string) {
    const user = await this.prismaService.client.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: true
          }
        },
        memberships: {
          include: {
            tenant: true,
            organization: true,
            orgUnit: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException(`User ${id} was not found.`);
    }

    return user;
  }

  async createUser(input: CreateUserRecordInput) {
    try {
      if (input.roleIds.length) {
        const roles = await this.prismaService.client.role.findMany({
          where: {
            id: {
              in: input.roleIds
            }
          },
          select: {
            id: true
          }
        });

        if (roles.length !== new Set(input.roleIds).size) {
          throw new NotFoundException('One or more roles were not found.');
        }
      }

      const data: Prisma.UserCreateInput = {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        status: input.status ?? 'invited'
      };

      if (input.externalSubject) {
        data.externalSubject = input.externalSubject;
      }

      if (input.roleIds.length) {
        data.userRoles = {
          createMany: {
            data: input.roleIds.map((roleId) => ({ roleId })),
            skipDuplicates: true
          }
        };
      }

      return await this.prismaService.client.user.create({
        data,
        include: {
          userRoles: {
            include: {
              role: true
            }
          }
        }
      });
    } catch (error) {
      this.handlePrismaConflict(error, 'User could not be created.');
    }
  }

  async listRoles() {
    return this.prismaService.client.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      },
      orderBy: {
        code: 'asc'
      }
    });
  }

  async createRole(input: CreateRoleRecordInput) {
    try {
      const data: Prisma.RoleCreateInput = {
        code: input.code,
        name: input.name
      };

      if (input.description) {
        data.description = input.description;
      }

      return await this.prismaService.client.role.create({
        data
      });
    } catch (error) {
      this.handlePrismaConflict(error, 'Role could not be created.');
    }
  }

  async listPermissions() {
    return this.prismaService.client.permission.findMany({
      orderBy: {
        code: 'asc'
      }
    });
  }

  async getRoleById(id: string) {
    const role = await this.prismaService.client.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    });

    if (!role) {
      throw new NotFoundException(`Role ${id} was not found.`);
    }

    return role;
  }

  async createPermission(input: CreatePermissionRecordInput) {
    try {
      const data: Prisma.PermissionCreateInput = {
        code: input.code,
        name: input.name
      };

      if (input.description) {
        data.description = input.description;
      }

      return await this.prismaService.client.permission.create({
        data
      });
    } catch (error) {
      this.handlePrismaConflict(error, 'Permission could not be created.');
    }
  }

  async assignRoles(userId: string, roleIds: string[]) {
    await this.getUserById(userId);

    const roles = await this.prismaService.client.role.findMany({
      where: {
        id: {
          in: roleIds
        }
      },
      select: {
        id: true
      }
    });

    if (roles.length !== new Set(roleIds).size) {
      throw new NotFoundException('One or more roles were not found.');
    }

    try {
      await this.prismaService.client.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
        skipDuplicates: true
      });
    } catch (error) {
      this.handlePrismaConflict(error, 'Roles could not be assigned.');
    }

    return this.getUserById(userId);
  }

  async updateUserStatus(userId: string, status: 'active' | 'disabled') {
    await this.getUserById(userId);

    return this.prismaService.client.user.update({
      where: { id: userId },
      data: { status },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
  }

  async syncRolePermissions(roleId: string, permissionIds: string[]) {
    return this.prismaService.client.$transaction(async (tx) => {
      const role = await tx.role.findUnique({
        where: { id: roleId }
      });

      if (!role) {
        throw new NotFoundException(`Role ${roleId} was not found.`);
      }

      if (permissionIds.length) {
        const permissions = await tx.permission.findMany({
          where: {
            id: {
              in: permissionIds
            }
          },
          select: {
            id: true
          }
        });

        if (permissions.length !== new Set(permissionIds).size) {
          throw new NotFoundException('One or more permissions were not found.');
        }
      }

      await tx.rolePermission.deleteMany({
        where: { roleId }
      });

      if (permissionIds.length) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
          skipDuplicates: true
        });
      }

      return tx.role.findUniqueOrThrow({
        where: { id: roleId },
        include: {
          rolePermissions: {
            include: {
              permission: true
            }
          }
        }
      });
    });
  }

  private handlePrismaConflict(error: unknown, fallbackMessage: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A unique constraint would be violated by this request.');
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new ConflictException(fallbackMessage);
  }
}
