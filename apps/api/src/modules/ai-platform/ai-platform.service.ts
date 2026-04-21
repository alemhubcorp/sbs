import { BadRequestException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AdminOpsService, type AiContentAssistantSettings } from '../admin-ops/admin-ops.service.js';

export type ProductAiAssistAction =
  | 'generate_description'
  | 'improve_description'
  | 'generate_seo_title'
  | 'generate_meta_description'
  | 'translate_description';

export type ProductAiAssistInput = {
  action: ProductAiAssistAction;
  name: string;
  description?: string | undefined;
  seoTitle?: string | undefined;
  metaDescription?: string | undefined;
  categoryName?: string | undefined;
  targetMarket: 'b2c' | 'b2b' | 'both';
  currency?: string | undefined;
  amountMinor?: number | undefined;
  language?: string | undefined;
};

export type ProductAiAssistResult = {
  action: ProductAiAssistAction;
  field: 'description' | 'seoTitle' | 'metaDescription' | 'localizedDescription';
  language?: string | undefined;
  value: string;
};

type ResponsesApiPayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

@Injectable()
export class AiPlatformService {
  constructor(@Inject(AdminOpsService) private readonly adminOpsService: AdminOpsService) {}

  async generateProductContent(input: ProductAiAssistInput): Promise<ProductAiAssistResult> {
    const settings = await this.adminOpsService.getAiContentSettings();
    this.ensureConfigured(settings);

    if (settings.provider !== 'openai') {
      throw new ServiceUnavailableException(`AI provider ${settings.provider} is not supported yet.`);
    }

    const response = await fetch(this.normalizeProviderUrl(settings.apiBaseUrl), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify(this.buildOpenAiRequest(settings, input))
    });

    const payload = (await response.json().catch(() => null)) as ResponsesApiPayload | { error?: { message?: string } } | null;
    if (!response.ok) {
      const reason =
        payload && typeof payload === 'object' && 'error' in payload && payload.error?.message
          ? payload.error.message
          : `AI request failed with status ${response.status}`;
      throw new ServiceUnavailableException(reason);
    }

    const suggestion = this.parseStructuredResponse(payload);
    if (!suggestion?.value?.trim()) {
      throw new ServiceUnavailableException('AI response did not contain usable content.');
    }

    return {
      action: input.action,
      field: suggestion.field,
      ...(suggestion.language ? { language: suggestion.language } : {}),
      value: suggestion.value.trim()
    };
  }

  private ensureConfigured(settings: AiContentAssistantSettings) {
    if (!settings.enabled) {
      throw new ServiceUnavailableException('AI content assistant is disabled by admin settings.');
    }

    if (!settings.apiKey) {
      throw new ServiceUnavailableException('AI content assistant is not configured with an API key.');
    }

    if (!settings.model) {
      throw new ServiceUnavailableException('AI content assistant model is not configured.');
    }

    if (!settings.apiBaseUrl) {
      throw new ServiceUnavailableException('AI content assistant API base URL is not configured.');
    }
  }

  private normalizeProviderUrl(apiBaseUrl: string) {
    const trimmed = apiBaseUrl.trim();
    if (trimmed.endsWith('/responses')) {
      return trimmed;
    }

    if (trimmed.endsWith('/v1')) {
      return `${trimmed}/responses`;
    }

    return trimmed;
  }

  private buildOpenAiRequest(settings: AiContentAssistantSettings, input: ProductAiAssistInput) {
    const schema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        field: {
          type: 'string',
          enum: ['description', 'seoTitle', 'metaDescription', 'localizedDescription']
        },
        language: {
          type: ['string', 'null']
        },
        value: {
          type: 'string'
        }
      },
      required: ['field', 'value', 'language']
    };

    return {
      model: settings.model,
      instructions: this.buildInstructions(input),
      input: this.buildPrompt(input),
      text: {
        format: {
          type: 'json_schema',
          name: 'catalog_product_ai_suggestion',
          schema,
          strict: true
        }
      }
    };
  }

  private buildInstructions(input: ProductAiAssistInput) {
    const targetMarket =
      input.targetMarket === 'b2b' ? 'wholesale / procurement' : input.targetMarket === 'b2c' ? 'retail consumer' : 'mixed retail and wholesale';

    return [
      'You write marketplace product content for a live B2B/B2C commerce platform.',
      'Keep outputs factual, commercially useful, and free of unsupported claims.',
      'Do not invent certifications, logistics promises, warranties, or compliance claims.',
      `Write for a ${targetMarket} audience.`,
      'Return only JSON matching the schema.'
    ].join(' ');
  }

  private buildPrompt(input: ProductAiAssistInput) {
    const price =
      typeof input.amountMinor === 'number' && input.amountMinor > 0 && input.currency
        ? `${input.currency} ${(input.amountMinor / 100).toFixed(2)}`
        : 'not provided';

    const actionPrompt: Record<ProductAiAssistAction, string> = {
      generate_description: 'Generate a product description in the same language as the product title unless a language is provided.',
      improve_description: 'Improve the existing product description without changing factual meaning.',
      generate_seo_title: 'Generate a concise SEO title for the product page.',
      generate_meta_description: 'Generate a concise meta description for the product page.',
      translate_description: 'Translate the product description into the requested target language.'
    };

    return [
      `Action: ${input.action}`,
      actionPrompt[input.action],
      `Product title: ${input.name}`,
      `Category: ${input.categoryName || 'not provided'}`,
      `Target market: ${input.targetMarket}`,
      `Base price: ${price}`,
      `Current description: ${input.description?.trim() || 'not provided'}`,
      `Current SEO title: ${input.seoTitle?.trim() || 'not provided'}`,
      `Current meta description: ${input.metaDescription?.trim() || 'not provided'}`,
      `Target language: ${input.language || 'not specified'}`
    ].join('\n');
  }

  private parseStructuredResponse(payload: ResponsesApiPayload | { error?: { message?: string } } | null) {
    const text =
      payload && typeof payload === 'object' && 'output_text' in payload && typeof payload.output_text === 'string'
        ? payload.output_text
        : Array.isArray((payload as ResponsesApiPayload | null)?.output)
          ? (payload as ResponsesApiPayload).output
              ?.flatMap((entry) => entry.content ?? [])
              .find((entry) => entry.type === 'output_text' && typeof entry.text === 'string')
              ?.text
          : null;

    if (!text) {
      return null;
    }

    try {
      const parsed = JSON.parse(text) as { field?: string; language?: string | null; value?: string };
      const field: ProductAiAssistResult['field'] =
        parsed.field === 'seoTitle' || parsed.field === 'metaDescription' || parsed.field === 'localizedDescription'
          ? parsed.field
          : 'description';
      return {
        field,
        language: parsed.language ?? undefined,
        value: typeof parsed.value === 'string' ? parsed.value : ''
      };
    } catch {
      throw new BadRequestException('AI response could not be parsed.');
    }
  }
}
