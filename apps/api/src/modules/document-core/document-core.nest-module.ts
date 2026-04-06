import { Module } from '@nestjs/common';
import { DocumentCoreController } from './document-core.controller.js';
import { DocumentCoreRepository } from './document-core.repository.js';
import { DocumentCoreService } from './document-core.service.js';

@Module({
  controllers: [DocumentCoreController],
  providers: [DocumentCoreRepository, DocumentCoreService]
})
export class DocumentCoreNestModule {}
