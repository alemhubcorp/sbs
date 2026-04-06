export interface DeferredProviderHook {
  key: string;
  domain:
    | 'auctions'
    | 'advanced-logistics-quote-engine'
    | 'insurance-integrations'
    | 'inspection-integrations'
    | 'bnpl-financing'
    | 'multilingual-multicurrency';
  description: string;
}

export const deferredProviderHooks: DeferredProviderHook[] = [
  {
    key: 'insurance-claims-adapter',
    domain: 'insurance-integrations',
    description: 'Future adapter contract for insurer policy and claims integration.'
  },
  {
    key: 'inspection-checkpoint-adapter',
    domain: 'inspection-integrations',
    description: 'Future adapter contract for inspection scheduling and checkpoint callbacks.'
  },
  {
    key: 'bnpl-provider-adapter',
    domain: 'bnpl-financing',
    description: 'Future financing orchestration adapter hook for non-lender provider integrations.'
  },
  {
    key: 'auction-engine-port',
    domain: 'auctions',
    description: 'Future wholesale auction interface without activating auction workflows yet.'
  },
  {
    key: 'advanced-logistics-quote-port',
    domain: 'advanced-logistics-quote-engine',
    description: 'Future quote-engine contract for logistics rate discovery and ranking.'
  }
];
