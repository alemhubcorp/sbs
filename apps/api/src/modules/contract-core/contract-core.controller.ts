import { Body, Controller, Get, Inject, Param, Post, Put, Req } from '@nestjs/common';
import { CurrentAuthContext } from '../../app/current-auth-context.decorator.js';
import { extractRequestAuditContext, type ApiRequestLike } from '../../app/auth-context.js';
import { RequirePermissions } from '../../app/permissions.decorator.js';
import { ContractCoreService } from './contract-core.service.js';

@Controller('contracts')
@RequirePermissions('contract.read')
export class ContractCoreController {
  constructor(@Inject(ContractCoreService) private readonly contractCoreService: ContractCoreService) {}

  @Get()
  listContracts(@CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.contractCoreService.listContracts(authContext!);
  }

  @Get(':id')
  getContractById(@Param('id') id: string, @CurrentAuthContext() authContext: ApiRequestLike['authContext']) {
    return this.contractCoreService.getContractById(id, authContext!);
  }

  @Post()
  @RequirePermissions('contract.manage')
  createContract(
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.contractCoreService.createContract(body, extractRequestAuditContext(request), authContext!);
  }

  @Post(':id/versions')
  @RequirePermissions('contract.manage')
  createContractVersion(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.contractCoreService.createContractVersion(id, body, extractRequestAuditContext(request), authContext!);
  }

  @Put(':id/status')
  @RequirePermissions('contract.manage')
  updateContractStatus(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: ApiRequestLike,
    @CurrentAuthContext() authContext: ApiRequestLike['authContext']
  ) {
    return this.contractCoreService.updateContractStatus(id, body, extractRequestAuditContext(request), authContext!);
  }
}
