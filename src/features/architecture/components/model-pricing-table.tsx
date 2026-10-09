'use client';

import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { modelPricingQueryOptions } from '../api/queries';
import type { ModelPricing } from '../api/types';
import type { RoutedModel } from '../data/openrouter-models';
import { NotApplicable } from './not-applicable';

const EXAMPLE_INPUT_TOKENS = 10_000;
const EXAMPLE_OUTPUT_TOKENS = 2_000;

const tokenFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2
});

function formatPrice(value: number) {
  if (value >= 0.1) {
    const precise = value.toFixed(3);
    return `$${precise.endsWith('0') ? value.toFixed(2) : precise}`;
  }
  return `$${Number(value.toPrecision(2))}`;
}

function formatTokens(value: number) {
  return tokenFormat.format(value);
}

interface ModelPricingTableProps {
  models: RoutedModel[];
  enabled: boolean;
}

export function ModelPricingTable({ models, enabled }: ModelPricingTableProps) {
  const { data, isPending, isError } = useQuery({ ...modelPricingQueryOptions(), enabled });
  const pricingBySlug = new Map(data?.models.map((model) => [model.slug, model]));
  const listed = models.flatMap((model) => {
    const pricing = pricingBySlug.get(model.slug);
    return pricing?.listed ? [pricing] : [];
  });
  const comparable = listed.length > 1;
  const cheapestInput = comparable ? minOf(listed.map((model) => model.inputPerM)) : undefined;
  const cheapestOutput = comparable ? minOf(listed.map((model) => model.outputPerM)) : undefined;
  const loading = enabled && isPending;

  return (
    <div className='flex shrink-0 flex-col gap-2'>
      <div className='border-border overflow-hidden rounded-xl border'>
        <Table className='text-xs'>
          <TableHeader>
            <TableRow className='bg-muted/40 hover:bg-muted/40'>
              <TableHead className='bg-popover sticky left-0 z-10 min-w-56'>
                <span className='bg-muted/40 absolute inset-0' />
                <span className='relative'>Model</span>
              </TableHead>
              <TableHead className='min-w-44'>Used for</TableHead>
              <TableHead>Input /1M</TableHead>
              <TableHead>Output /1M</TableHead>
              <TableHead>Cache read /1M</TableHead>
              <TableHead>Cache write /1M</TableHead>
              <TableHead>Reasoning /1M</TableHead>
              <TableHead>Long context</TableHead>
              <TableHead>Media /1M</TableHead>
              <TableHead>Web search</TableHead>
              <TableHead>Context</TableHead>
              <TableHead>Max output</TableHead>
              <TableHead>Modalities</TableHead>
              <TableHead className='min-w-40'>Features</TableHead>
              <TableHead>Example call</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((model) => (
              <ModelRow
                key={model.slug}
                model={model}
                pricing={pricingBySlug.get(model.slug)}
                loading={loading}
                failed={isError}
                cheapestInput={cheapestInput}
                cheapestOutput={cheapestOutput}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      <p className='text-muted-foreground text-[11px] leading-snug'>
        {data
          ? `Live from OpenRouter, fetched ${new Date(data.fetchedAt).toLocaleString()}.`
          : 'Prices load live from OpenRouter.'}{' '}
        Example call is {formatTokens(EXAMPLE_INPUT_TOKENS)} input +{' '}
        {formatTokens(EXAMPLE_OUTPUT_TOKENS)} output tokens. OpenRouter passes provider prices
        through and adds a 5.5% fee when buying credits.
      </p>
    </div>
  );
}

function minOf(values: (number | undefined)[]) {
  const defined = values.filter((value): value is number => value !== undefined);
  return defined.length ? Math.min(...defined) : undefined;
}

interface ModelRowProps {
  model: RoutedModel;
  pricing: ModelPricing | undefined;
  loading: boolean;
  failed: boolean;
  cheapestInput: number | undefined;
  cheapestOutput: number | undefined;
}

function ModelRow({
  model,
  pricing,
  loading,
  failed,
  cheapestInput,
  cheapestOutput
}: ModelRowProps) {
  const unavailable = failed
    ? 'Pricing could not be loaded'
    : !pricing?.listed
      ? 'Not listed on OpenRouter'
      : null;

  const cell = (content: ReactNode, reason = 'Not priced separately by this model') => {
    if (loading) return <Icons.spinner className='text-muted-foreground size-3.5 animate-spin' />;
    if (unavailable) return <NotApplicable reason={unavailable} />;
    return content ?? <NotApplicable reason={reason} />;
  };

  const price = (value: number | undefined, highlight = false) =>
    value === undefined ? null : (
      <span className={cn(highlight && 'text-primary font-semibold')}>{formatPrice(value)}</span>
    );

  const media = pricing
    ? [
        pricing.imageInputPerM !== undefined && `Image in ${formatPrice(pricing.imageInputPerM)}`,
        pricing.imageOutputPerM !== undefined &&
          `Image out ${formatPrice(pricing.imageOutputPerM)}`,
        pricing.audioInputPerM !== undefined && `Audio in ${formatPrice(pricing.audioInputPerM)}`
      ].filter(Boolean)
    : [];

  const exampleCost =
    pricing?.inputPerM !== undefined && pricing.outputPerM !== undefined
      ? (EXAMPLE_INPUT_TOKENS * pricing.inputPerM + EXAMPLE_OUTPUT_TOKENS * pricing.outputPerM) /
          1_000_000 +
        (pricing.requestFee ?? 0)
      : undefined;

  return (
    <TableRow>
      <TableCell className='bg-popover sticky left-0 z-10 align-top'>
        <div className='flex items-center gap-1.5'>
          <span className='font-medium'>{pricing?.listed ? pricing.name : model.slug}</span>
          <Badge
            variant={model.role === 'Primary' ? 'secondary' : 'outline'}
            className='h-4 px-1.5 text-[10px]'
          >
            {model.role}
          </Badge>
        </div>
        {!loading && !failed && !pricing?.listed ? (
          <div className='text-[10px] text-amber-600 dark:text-amber-400'>
            Not in OpenRouter&apos;s catalogue
          </div>
        ) : (
          <div className='text-muted-foreground font-mono text-[10px]'>{model.slug}</div>
        )}
      </TableCell>
      <TableCell className='align-top whitespace-normal'>{model.usedFor.join(', ')}</TableCell>
      <TableCell className='align-top'>
        {cell(price(pricing?.inputPerM, pricing?.inputPerM === cheapestInput))}
      </TableCell>
      <TableCell className='align-top'>
        {cell(price(pricing?.outputPerM, pricing?.outputPerM === cheapestOutput))}
      </TableCell>
      <TableCell className='align-top'>{cell(price(pricing?.cacheReadPerM))}</TableCell>
      <TableCell className='align-top'>{cell(price(pricing?.cacheWritePerM))}</TableCell>
      <TableCell className='align-top'>
        {cell(
          price(pricing?.reasoningPerM) ??
            (pricing?.features.includes('Reasoning') ? (
              <span className='text-muted-foreground'>Billed as output</span>
            ) : null),
          'Model has no reasoning mode'
        )}
      </TableCell>
      <TableCell className='align-top whitespace-normal'>
        {cell(
          pricing?.longContext ? (
            <span>
              Over {formatTokens(pricing.longContext.minPromptTokens)}:{' '}
              {[pricing.longContext.inputPerM, pricing.longContext.outputPerM]
                .map((value) => (value === undefined ? '—' : formatPrice(value)))
                .join(' / ')}
            </span>
          ) : null,
          'Same price at every prompt length'
        )}
      </TableCell>
      <TableCell className='align-top whitespace-normal'>
        {cell(
          media.length ? (
            <div className='flex flex-col'>
              {media.map((line) => (
                <span key={String(line)}>{line}</span>
              ))}
            </div>
          ) : null,
          'Media billed as regular tokens'
        )}
      </TableCell>
      <TableCell className='align-top'>
        {cell(
          pricing?.webSearchPerCall !== undefined ? (
            <span>{formatPrice(pricing.webSearchPerCall)} / call</span>
          ) : null,
          'No native web search pricing'
        )}
      </TableCell>
      <TableCell className='align-top'>
        {cell(pricing?.contextLength ? formatTokens(pricing.contextLength) : null, 'Not published')}
      </TableCell>
      <TableCell className='align-top'>
        {cell(pricing?.maxOutput ? formatTokens(pricing.maxOutput) : null, 'Not published')}
      </TableCell>
      <TableCell className='align-top whitespace-normal'>
        {cell(
          pricing?.inputModalities.length ? (
            <span>
              {pricing.inputModalities.join(', ')} → {pricing.outputModalities.join(', ')}
            </span>
          ) : null,
          'Not published'
        )}
      </TableCell>
      <TableCell className='align-top whitespace-normal'>
        {cell(
          pricing?.features.length ? (
            <div className='flex flex-wrap gap-1'>
              {pricing.features.map((feature) => (
                <Badge key={feature} variant='outline' className='h-4 px-1.5 text-[10px]'>
                  {feature}
                </Badge>
              ))}
            </div>
          ) : null,
          'No advanced features listed'
        )}
      </TableCell>
      <TableCell className='align-top font-medium'>
        {cell(exampleCost === undefined ? null : formatPrice(exampleCost))}
      </TableCell>
    </TableRow>
  );
}
