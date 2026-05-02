import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { AuthContext, RequestAuditContext } from '../../app/auth-context.js';
import { ResourceAccessService } from '../../app/resource-access.service.js';
import { AuditService } from '../audit-observability/audit.service.js';
import { DocumentCoreRepository } from './document-core.repository.js';

const jsonSchema = z.custom<Prisma.InputJsonValue | undefined>(
  (value) => value === undefined || value === null || typeof value === 'object' || Array.isArray(value),
  { message: 'Expected JSON-compatible metadata.' }
);

const createDocumentSchema = z.object({
  tenantId: z.string().min(1).optional(),
  uploadedByUserId: z.string().min(1).optional(),
  documentType: z.enum(['contract', 'attachment', 'evidence', 'commercial', 'compliance', 'other']),
  status: z.enum(['uploaded', 'linked', 'approved', 'rejected']).optional(),
  name: z.string().min(1).max(200),
  contentType: z.string().min(1).max(120).optional(),
  storageBucket: z.string().min(1).max(120).optional(),
  storageKey: z.string().min(1).max(500).optional(),
  sizeBytes: z.coerce.number().int().min(0).optional(),
  checksum: z.string().min(1).max(200).optional(),
  metadata: jsonSchema.optional()
});

const createDocumentLinkSchema = z.object({
  dealId: z.string().min(1).optional(),
  contractId: z.string().min(1).optional(),
  linkType: z.enum(['deal_attachment', 'contract_attachment', 'supporting_evidence'])
});

const updateDocumentStatusSchema = z.object({
  status: z.enum(['uploaded', 'linked', 'approved', 'rejected'])
});

@Injectable()
export class DocumentCoreService {
  constructor(
    @Inject(DocumentCoreRepository) private readonly documentCoreRepository: DocumentCoreRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(ResourceAccessService) private readonly resourceAccessService: ResourceAccessService
  ) {}

  async listDocuments(authContext: AuthContext) {
    const documents = await this.documentCoreRepository.listDocuments();
    return this.resourceAccessService.filterByTenant(authContext, documents, (document) => {
      return (
        document.tenantId ??
        document.links.find((link) => link.deal?.tenantId)?.deal?.tenantId
      );
    });
  }

  async getDocumentById(id: string, authContext: AuthContext) {
    await this.resourceAccessService.ensureDocumentAccess(authContext, id);
    return this.documentCoreRepository.getDocumentById(id);
  }

  async createDocument(input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    const parsed = createDocumentSchema.parse(input);
    if (parsed.tenantId) {
      this.resourceAccessService.ensureTenantAccess(authContext, parsed.tenantId);
    }
    const document = await this.documentCoreRepository.createDocument(parsed);

    await this.auditService.record({
      module: 'document-core',
      eventType: 'document.created',
      actorId: auditContext.actorId,
      tenantId: document.tenantId ?? auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'document',
      subjectId: document.id,
      payload: {
        documentType: document.documentType,
        status: document.status,
        name: document.name,
        storageBucket: document.storageBucket,
        storageKey: document.storageKey
      }
    });

    return document;
  }

  async createUploadedFileRecord(input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    const parsed = createDocumentSchema.parse(input);
    const document = await this.documentCoreRepository.createDocument({
      ...parsed,
      tenantId: parsed.tenantId ?? authContext.tenantId ?? undefined,
      uploadedByUserId: authContext.internalUserId ?? parsed.uploadedByUserId
    });

    await this.auditService.record({
      module: 'document-core',
      eventType: 'uploaded-file.created',
      actorId: auditContext.actorId,
      tenantId: document.tenantId ?? auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'document',
      subjectId: document.id,
      payload: {
        documentType: document.documentType,
        contentType: document.contentType,
        name: document.name,
        storageBucket: document.storageBucket,
        storageKey: document.storageKey
      }
    });

    return document;
  }

  async createDocumentLink(documentId: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    await this.resourceAccessService.ensureDocumentAccess(authContext, documentId);
    const parsed = createDocumentLinkSchema.parse(input);
    if (parsed.dealId) {
      await this.resourceAccessService.ensureDealAccess(authContext, parsed.dealId);
    }
    if (parsed.contractId) {
      await this.resourceAccessService.ensureContractAccess(authContext, parsed.contractId);
    }
    const link = await this.documentCoreRepository.createDocumentLink({
      documentId,
      ...parsed
    });

    await this.auditService.record({
      module: 'document-core',
      eventType: 'document.link.created',
      actorId: auditContext.actorId,
      tenantId: link.deal?.tenantId ?? auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'document-link',
      subjectId: link.id,
      payload: {
        documentId: link.documentId,
        dealId: link.dealId,
        contractId: link.contractId,
        linkType: link.linkType
      }
    });

    return link;
  }

  async updateDocumentStatus(id: string, input: unknown, auditContext: RequestAuditContext, authContext: AuthContext) {
    await this.resourceAccessService.ensureDocumentAccess(authContext, id);
    const document = await this.documentCoreRepository.updateDocumentStatus(
      id,
      updateDocumentStatusSchema.parse(input).status
    );

    await this.auditService.record({
      module: 'document-core',
      eventType: 'document.status.updated',
      actorId: auditContext.actorId,
      tenantId: document.tenantId ?? auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'document',
      subjectId: document.id,
      payload: {
        status: document.status
      }
    });

    return document;
  }

  async deleteDocument(id: string, auditContext: RequestAuditContext, authContext: AuthContext) {
    if (!this.resourceAccessService.isPlatformAdmin(authContext)) {
      await this.resourceAccessService.ensureDocumentAccess(authContext, id);
    }

    const document = await this.documentCoreRepository.deleteDocument(id);

    await this.auditService.record({
      module: 'document-core',
      eventType: 'document.deleted',
      actorId: auditContext.actorId,
      tenantId: document.tenantId ?? auditContext.tenantId,
      correlationId: auditContext.correlationId,
      subjectType: 'document',
      subjectId: document.id,
      payload: {
        name: document.name,
        storageBucket: document.storageBucket,
        storageKey: document.storageKey
      }
    });

    return { success: true, id: document.id };
  }
}
