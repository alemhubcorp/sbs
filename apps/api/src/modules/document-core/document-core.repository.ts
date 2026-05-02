import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../app/prisma.service.js';

export interface CreateDocumentInput {
  tenantId?: string | undefined;
  uploadedByUserId?: string | undefined;
  documentType: 'contract' | 'attachment' | 'evidence' | 'commercial' | 'compliance' | 'other';
  status?: 'uploaded' | 'linked' | 'approved' | 'rejected' | undefined;
  name: string;
  contentType?: string | undefined;
  storageBucket?: string | undefined;
  storageKey?: string | undefined;
  sizeBytes?: number | undefined;
  checksum?: string | undefined;
  metadata?: Prisma.InputJsonValue | undefined;
}

export interface CreateDocumentLinkInput {
  documentId: string;
  dealId?: string | undefined;
  contractId?: string | undefined;
  linkType: 'deal_attachment' | 'contract_attachment' | 'supporting_evidence';
}

@Injectable()
export class DocumentCoreRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  listDocuments() {
    return this.prismaService.client.document.findMany({
      include: this.documentInclude,
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getDocumentById(id: string) {
    const document = await this.prismaService.client.document.findUnique({
      where: { id },
      include: this.documentInclude
    });

    if (!document) {
      throw new NotFoundException(`Document ${id} was not found.`);
    }

    return document;
  }

  async createDocument(input: CreateDocumentInput) {
    await this.ensureDocumentRelations(input.tenantId, input.uploadedByUserId);

    return this.prismaService.client.document.create({
      data: {
        ...(input.tenantId ? { tenantId: input.tenantId } : {}),
        ...(input.uploadedByUserId ? { uploadedByUserId: input.uploadedByUserId } : {}),
        documentType: input.documentType,
        status: input.status ?? 'uploaded',
        name: input.name,
        ...(input.contentType ? { contentType: input.contentType } : {}),
        ...(input.storageBucket ? { storageBucket: input.storageBucket } : {}),
        ...(input.storageKey ? { storageKey: input.storageKey } : {}),
        ...(typeof input.sizeBytes === 'number' ? { sizeBytes: input.sizeBytes } : {}),
        ...(input.checksum ? { checksum: input.checksum } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {})
      },
      include: this.documentInclude
    });
  }

  async createDocumentLink(input: CreateDocumentLinkInput) {
    const document = await this.prismaService.client.document.findUnique({
      where: { id: input.documentId },
      select: { id: true }
    });

    if (!document) {
      throw new NotFoundException(`Document ${input.documentId} was not found.`);
    }

    if (!input.dealId && !input.contractId) {
      throw new ConflictException('A document link requires a dealId or contractId.');
    }

    const [deal, contract] = await Promise.all([
      input.dealId
        ? this.prismaService.client.wholesaleDeal.findUnique({ where: { id: input.dealId }, select: { id: true } })
        : Promise.resolve(null),
      input.contractId
        ? this.prismaService.client.contract.findUnique({ where: { id: input.contractId }, select: { id: true } })
        : Promise.resolve(null)
    ]);

    if (input.dealId && !deal) {
      throw new NotFoundException(`Deal ${input.dealId} was not found.`);
    }

    if (input.contractId && !contract) {
      throw new NotFoundException(`Contract ${input.contractId} was not found.`);
    }

    const link = await this.prismaService.client.documentLink.create({
      data: {
        documentId: input.documentId,
        ...(input.dealId ? { dealId: input.dealId } : {}),
        ...(input.contractId ? { contractId: input.contractId } : {}),
        linkType: input.linkType
      },
      include: {
        document: true,
        deal: true,
        contract: true
      }
    });

    await this.prismaService.client.document.update({
      where: { id: input.documentId },
      data: {
        status: 'linked'
      }
    });

    return link;
  }

  async updateDocumentStatus(id: string, status: 'uploaded' | 'linked' | 'approved' | 'rejected') {
    await this.getDocumentById(id);

    return this.prismaService.client.document.update({
      where: { id },
      data: { status },
      include: this.documentInclude
    });
  }

  async deleteDocument(id: string) {
    await this.getDocumentById(id);

    return this.prismaService.client.document.delete({
      where: { id },
      include: this.documentInclude
    });
  }

  private async ensureDocumentRelations(tenantId?: string, uploadedByUserId?: string) {
    const [tenant, user] = await Promise.all([
      tenantId
        ? this.prismaService.client.tenant.findUnique({ where: { id: tenantId }, select: { id: true } })
        : Promise.resolve(null),
      uploadedByUserId
        ? this.prismaService.client.user.findUnique({ where: { id: uploadedByUserId }, select: { id: true } })
        : Promise.resolve(null)
    ]);

    if (tenantId && !tenant) {
      throw new NotFoundException(`Tenant ${tenantId} was not found.`);
    }

    if (uploadedByUserId && !user) {
      throw new NotFoundException(`User ${uploadedByUserId} was not found.`);
    }
  }

  private readonly documentInclude = {
    tenant: true,
    uploadedByUser: true,
    links: {
      include: {
        deal: true,
        contract: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    }
  } satisfies Prisma.DocumentInclude;
}
