import type { ModelPricing, ModelPricingResponse } from '../api/types';
import { routedModels } from '../data/openrouter-models';

const CATALOGUE_URL = 'https://openrouter.ai/api/v1/models';

type Price = string | undefined;

interface OpenRouterModel {
  id: string;
  name: string;
  context_length?: number;
  architecture?: { input_modalities?: string[]; output_modalities?: string[] };
  pricing?: Record<string, Price> & {
    overrides?: ({ min_prompt_tokens?: number } & Record<string, Price | number>)[];
  };
  top_provider?: { max_completion_tokens?: number | null };
  supported_parameters?: string[];
}

const featureLabels: [string, string][] = [
  ['tools', 'Tools'],
  ['structured_outputs', 'Structured outputs'],
  ['reasoning', 'Reasoning'],
  ['web_search_options', 'Web search']
];

function perToken(value: unknown): number | undefined {
  const parsed = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function perMillion(value: unknown): number | undefined {
  const price = perToken(value);
  return price === undefined ? undefined : price * 1_000_000;
}

function toPricing(slug: string, model: OpenRouterModel | undefined): ModelPricing {
  if (!model) {
    return {
      slug,
      name: slug,
      listed: false,
      inputModalities: [],
      outputModalities: [],
      features: []
    };
  }
  const pricing = model.pricing ?? {};
  const override = pricing.overrides?.[0];
  const parameters = new Set(model.supported_parameters ?? []);
  const features = featureLabels.flatMap(([key, label]) => (parameters.has(key) ? [label] : []));
  if (perToken(pricing.web_search) && !features.includes('Web search')) features.push('Web search');

  return {
    slug,
    name: model.name.replace(/^[^:]+:\s*/, ''),
    listed: true,
    inputPerM: perMillion(pricing.prompt),
    outputPerM: perMillion(pricing.completion),
    cacheReadPerM: perMillion(pricing.input_cache_read),
    cacheWritePerM: perMillion(pricing.input_cache_write),
    reasoningPerM: perMillion(pricing.internal_reasoning),
    imageInputPerM: perMillion(pricing.image),
    imageOutputPerM: perMillion(pricing.image_output),
    audioInputPerM: perMillion(pricing.audio),
    webSearchPerCall: perToken(pricing.web_search),
    requestFee: perToken(pricing.request),
    longContext: override?.min_prompt_tokens
      ? {
          minPromptTokens: override.min_prompt_tokens,
          inputPerM: perMillion(override.prompt),
          outputPerM: perMillion(override.completion)
        }
      : undefined,
    contextLength: model.context_length,
    maxOutput: model.top_provider?.max_completion_tokens ?? undefined,
    inputModalities: model.architecture?.input_modalities ?? [],
    outputModalities: model.architecture?.output_modalities ?? [],
    features
  };
}

export async function fetchModelPricing(): Promise<ModelPricingResponse> {
  const response = await fetch(CATALOGUE_URL, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`OpenRouter catalogue returned ${response.status}`);
  const { data } = (await response.json()) as { data: OpenRouterModel[] };
  const byId = new Map(data.map((model) => [model.id, model]));
  return {
    models: routedModels.map((routed) => toPricing(routed.slug, byId.get(routed.slug))),
    fetchedAt: new Date().toISOString()
  };
}
