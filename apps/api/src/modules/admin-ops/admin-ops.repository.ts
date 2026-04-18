import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../app/prisma.service.js';

export type AdminSettingRow = {
  id: string;
  key: string;
  section: string;
  value: Prisma.JsonValue;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const adminSettingSelect = {
  id: true,
  key: true,
  section: true,
  value: true,
  updatedByUserId: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.AdminSettingSelect;

@Injectable()
export class AdminOpsRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  listSettings(): Promise<AdminSettingRow[]> {
    return this.prismaService.client.adminSetting.findMany({
      select: adminSettingSelect,
      orderBy: [
        {
          section: 'asc'
        },
        {
          key: 'asc'
        }
      ]
    });
  }

  async getSetting(key: string): Promise<AdminSettingRow | null> {
    return this.prismaService.client.adminSetting.findUnique({
      where: { key },
      select: adminSettingSelect
    });
  }

  async upsertSetting(input: { key: string; section: string; value: Prisma.InputJsonValue; updatedByUserId?: string | null }): Promise<AdminSettingRow> {
    return this.prismaService.client.adminSetting.upsert({
      where: { key: input.key },
      create: {
        key: input.key,
        section: input.section,
        value: input.value,
        ...(input.updatedByUserId ? { updatedByUserId: input.updatedByUserId } : {})
      },
      update: {
        section: input.section,
        value: input.value,
        updatedByUserId: input.updatedByUserId ?? null
      },
      select: adminSettingSelect
    });
  }

  async ensureDefaultSettings(defaults: Array<{ key: string; section: string; value: Prisma.InputJsonValue }>): Promise<AdminSettingRow[]> {
    const existing = await this.listSettings();
    const existingKeys = new Set(existing.map((setting) => setting.key));

    const created: AdminSettingRow[] = [];
    for (const setting of defaults) {
      if (existingKeys.has(setting.key)) {
        continue;
      }

      created.push(
        await this.prismaService.client.adminSetting.create({
          data: {
            key: setting.key,
            section: setting.section,
            value: setting.value
          },
          select: adminSettingSelect
        })
      );
    }

    return created;
  }
}
