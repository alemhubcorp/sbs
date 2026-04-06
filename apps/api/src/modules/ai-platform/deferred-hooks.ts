export interface DeferredAiHook {
  key: string;
  domain:
    | 'ai-admin-assistant'
    | 'client-ai-subscription-agents'
    | 'embedded-visual-agent-center'
    | 'advanced-marketing-automation';
  description: string;
}

export const deferredAiHooks: DeferredAiHook[] = [
  {
    key: 'admin-assistant-template',
    domain: 'ai-admin-assistant',
    description: 'Future admin assistant policy/template registration hook.'
  },
  {
    key: 'client-agent-subscription-template',
    domain: 'client-ai-subscription-agents',
    description: 'Future tenant-packaged agent template hook.'
  },
  {
    key: 'agent-control-center-view-model',
    domain: 'embedded-visual-agent-center',
    description: 'Future visual orchestration console projection hook.'
  },
  {
    key: 'marketing-automation-agent-template',
    domain: 'advanced-marketing-automation',
    description: 'Future marketing workflow agent hook.'
  }
];
