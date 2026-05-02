import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const privateControllers = [
  'apps/api/src/modules/contract-core/contract-core.controller.ts'
];

let failed = false;

for (const file of privateControllers) {
  const absolutePath = resolve(process.cwd(), file);
  const source = readFileSync(absolutePath, 'utf8');

  if (source.includes('@Public()')) {
    console.error(`${file} must not use @Public(); RFQ, quotes, deals, and escrow actions require JWT permissions.`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('Private API route guard check passed.');
