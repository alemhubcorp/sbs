import { Injectable } from '@nestjs/common';
import { appModules } from '../modules/index.js';

@Injectable()
export class ModulesRegistryService {
  list() {
    return appModules;
  }
}
