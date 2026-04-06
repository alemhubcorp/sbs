import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AuditRepository, type RecordAuditEventInput } from './audit.repository.js';

const listAuditEventsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

@Injectable()
export class AuditService {
  constructor(@Inject(AuditRepository) private readonly auditRepository: AuditRepository) {}

  record(event: RecordAuditEventInput) {
    return this.auditRepository.record(event);
  }

  list(query: unknown) {
    const { limit } = listAuditEventsSchema.parse(query);
    return this.auditRepository.list(limit);
  }
}
