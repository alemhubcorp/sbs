import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Req } from '@nestjs/common';
import { CurrentAuthContext } from '../../app/current-auth-context.decorator.js';
import { extractRequestAuditContext, type ApiRequestLike } from '../../app/auth-context.js';
import { RequirePermissions } from '../../app/permissions.decorator.js';
import { DocumentCoreService } from './document-core.service.js';

@Controller('documents')
@RequirePermissions('document.read')
export class DocumentCoreController {
  constructor(@Inject(DocumentCoreService) private readonly documentCoreService: DocumentCoreService) {}

  @Get()
  listDocuments(@CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.documentCoreService.listDocuments(authContext!);
  }

  @Get(':id')
  getDocumentById(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.documentCoreService.getDocumentById(id, authContext!);
  }

  @Post()
  @RequirePermissions('document.manage')
  createDocument(
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.documentCoreService.createDocument(body, extractRequestAuditContext(request), authContext!);
  }

  @Post('uploaded-files')
  @RequirePermissions('catalog.manage')
  createUploadedFileRecord(
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.documentCoreService.createUploadedFileRecord(body, extractRequestAuditContext(request), authContext!);
  }

  @Post(':id/links')
  @RequirePermissions('document.manage')
  createDocumentLink(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.documentCoreService.createDocumentLink(id, body, extractRequestAuditContext(request), authContext!);
  }

  @Put(':id/status')
  @RequirePermissions('document.manage')
  updateDocumentStatus(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.documentCoreService.updateDocumentStatus(id, body, extractRequestAuditContext(request), authContext!);
  }

  @Delete(':id')
  @RequirePermissions('document.manage')
  deleteDocument(
    @Param('id') id: string,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.documentCoreService.deleteDocument(id, extractRequestAuditContext(request), authContext!);
  }
}
