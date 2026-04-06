import { Controller, Get } from '@nestjs/common';
import { appModules } from '../modules/index.js';
import { RequirePermissions } from './permissions.decorator.js';

@Controller('modules')
@RequirePermissions('admin.access')
export class ModulesController {
  @Get()
  list() {
    return appModules;
  }
}
