export type ModelProvider = 'google' | 'openai' | 'anthropic' | 'xiaomi';

export interface RoutedModel {
  slug: string;
  provider: ModelProvider;
  role: 'Primary' | 'Fallback';
  usedFor: string[];
}

/** OpenRouter slugs called by Golden Papers (defaults; env overrides there can't be read here). */
export const routedModels: RoutedModel[] = [
  {
    slug: 'google/gemini-3.5-flash',
    provider: 'google',
    role: 'Primary',
    usedFor: ['Agent chat', 'Document overviews', 'Section clarification', 'Web search']
  },
  {
    slug: 'google/gemini-3-pro-preview',
    provider: 'google',
    role: 'Primary',
    usedFor: ['Strategy generation']
  },
  {
    slug: 'google/gemini-3-flash-preview',
    provider: 'google',
    role: 'Primary',
    usedFor: ['Document type analysis']
  },
  {
    slug: 'google/gemini-3-pro-image',
    provider: 'google',
    role: 'Primary',
    usedFor: ['Design block images']
  },
  {
    slug: 'google/gemini-2.0-flash-001',
    provider: 'google',
    role: 'Primary',
    usedFor: ['Block inspect', 'Block keywords']
  },
  {
    slug: 'openai/gpt-5.6-terra',
    provider: 'openai',
    role: 'Primary',
    usedFor: ['Document research', 'Section generation fallback']
  },
  {
    slug: 'openai/gpt-5.4',
    provider: 'openai',
    role: 'Primary',
    usedFor: ['Document type context']
  },
  {
    slug: 'openai/gpt-5.4-mini',
    provider: 'openai',
    role: 'Primary',
    usedFor: ['Section generation helpers']
  },
  {
    slug: 'openai/gpt-5.2',
    provider: 'openai',
    role: 'Primary',
    usedFor: ['Block regenerate']
  },
  {
    slug: 'openai/gpt-5.2-mini',
    provider: 'openai',
    role: 'Primary',
    usedFor: ['Markdown self-review', 'Block image prompts']
  },
  {
    slug: 'openai/gpt-4o',
    provider: 'openai',
    role: 'Fallback',
    usedFor: ['Block regenerate', 'Block image prompts']
  },
  {
    slug: 'openai/gpt-4o-mini',
    provider: 'openai',
    role: 'Fallback',
    usedFor: ['Block inspect', 'Block keywords']
  },
  {
    slug: 'anthropic/claude-sonnet-5.5',
    provider: 'anthropic',
    role: 'Primary',
    usedFor: ['Section generation']
  },
  {
    slug: 'xiaomi/mimo-v2.5-pro',
    provider: 'xiaomi',
    role: 'Primary',
    usedFor: ['Covers', 'Masters', 'Agent chat fallback']
  }
];

export const nodeModelProvider: Partial<Record<string, ModelProvider>> = {
  gemini: 'google',
  openai: 'openai',
  anthropic: 'anthropic',
  xiaomi: 'xiaomi'
};

export function modelsForNode(nodeId: string): RoutedModel[] {
  if (nodeId === 'openrouter') return routedModels;
  const provider = nodeModelProvider[nodeId];
  return provider ? routedModels.filter((model) => model.provider === provider) : [];
}
