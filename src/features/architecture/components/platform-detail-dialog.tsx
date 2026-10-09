'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { platformFeaturesByPlatformQueryOptions } from '@/features/platform-features/api/queries';
import type {
  PlatformFeature,
  PlatformFeatureSection
} from '@/features/platform-features/api/types';
import {
  FeatureIcon,
  FeatureStatusBadge,
  ServiceBadges
} from '@/features/platform-features/components/feature-display';
import { cn } from '@/lib/utils';
import { architectureNodes, type ArchitectureNodeData } from '../data/architecture-graph';
import {
  platformSectionOrder,
  platformSections,
  sectionUrl,
  type PlatformSection,
  type PlatformSectionId,
  type PlatformSections
} from '../data/platform-details';
import { BrandLogo } from './brand-logo';
import { FittedPreview } from './fitted-preview';

const nodesById = new Map(architectureNodes.map((node) => [node.id, node]));

interface PlatformDetailDialogProps {
  platformId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlatformDetailDialog({
  platformId,
  open,
  onOpenChange
}: PlatformDetailDialogProps) {
  const platform = platformId ? nodesById.get(platformId) : undefined;
  const sections = platformId ? platformSections[platformId] : undefined;

  return (
    <Dialog open={open && Boolean(platform)} onOpenChange={onOpenChange}>
      {platform && platformId && sections ? (
        <DialogContent className='flex h-[90vh] w-[95vw] max-w-[1600px] flex-col gap-4 p-5 sm:max-w-[1600px]'>
          <PlatformHeader data={platform.data} />
          <PlatformDetailContent
            key={platformId}
            platformId={platformId}
            platform={platform.data}
            sections={sections}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function groupBySection(features: PlatformFeature[]) {
  const groups = new Map<PlatformFeatureSection, PlatformFeature[]>();
  for (const feature of features) {
    const group = groups.get(feature.section);
    if (group) group.push(feature);
    else groups.set(feature.section, [feature]);
  }
  return groups;
}

interface PlatformDetailContentProps {
  platformId: string;
  platform: ArchitectureNodeData;
  sections: PlatformSections;
}

function PlatformDetailContent({ platformId, platform, sections }: PlatformDetailContentProps) {
  const [selected, setSelected] = useState<PlatformSectionId | null>(null);
  const { data, isPending, isError } = useQuery(platformFeaturesByPlatformQueryOptions(platformId));
  const featuresBySection = useMemo(() => groupBySection(data ?? []), [data]);
  const selectedLabel = platformSectionOrder.find((section) => section.id === selected)?.label;
  const features = featuresBySection.get(selected ?? 'general') ?? [];

  return (
    <div className='grid min-h-0 flex-1 grid-cols-[1fr_380px] gap-4'>
      <div className='grid min-h-0 grid-cols-2 grid-rows-2 gap-3'>
        {platformSectionOrder.map((section) => (
          <PlatformSectionFrame
            key={section.id}
            label={section.label}
            section={sections[section.id]}
            platform={platform}
            count={data ? (featuresBySection.get(section.id)?.length ?? 0) : null}
            selected={selected === section.id}
            onToggle={() => setSelected((current) => (current === section.id ? null : section.id))}
          />
        ))}
      </div>
      <div className='flex min-h-0 flex-col'>
        <div className='mb-2 flex h-7 items-center justify-between gap-2 px-1'>
          <h3 className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
            {selectedLabel ?? 'General'}
            {data ? ` · ${features.length}` : null}
          </h3>
          {selected ? (
            <Button
              variant='ghost'
              size='xs'
              className='text-muted-foreground'
              onClick={() => setSelected(null)}
            >
              <Icons.close />
              Show general
            </Button>
          ) : null}
        </div>
        <ScrollArea className='min-h-0 flex-1'>
          {isPending ? (
            <p className='text-muted-foreground flex items-center justify-center gap-2 p-4 text-xs'>
              <Icons.spinner className='size-3.5 animate-spin' stroke={1.75} />
              Loading functionalities…
            </p>
          ) : isError ? (
            <p className='text-destructive rounded-xl border border-dashed p-4 text-center text-xs'>
              Couldn&apos;t load functionalities
            </p>
          ) : features.length ? (
            <ul className='flex flex-col gap-2 pr-3'>
              {features.map((feature) => (
                <FeatureItem key={feature.id} feature={feature} />
              ))}
            </ul>
          ) : (
            <p className='text-muted-foreground rounded-xl border border-dashed p-4 text-center text-xs'>
              No functionalities specific to {selectedLabel}
            </p>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

function PlatformHeader({ data }: { data: ArchitectureNodeData }) {
  return (
    <DialogHeader className='flex-row items-center gap-3 pr-10'>
      {data.logo ? <BrandLogo logo={data.logo} logoDark={data.logoDark} size={40} /> : null}
      <div className='min-w-0'>
        <DialogTitle className='text-base'>{data.label}</DialogTitle>
        <DialogDescription className='text-xs'>
          {data.description}
          {data.url ? <span className='ml-2 font-mono'>{new URL(data.url).host}</span> : null}
        </DialogDescription>
      </div>
    </DialogHeader>
  );
}

interface PlatformSectionFrameProps {
  label: string;
  section: PlatformSection;
  platform: ArchitectureNodeData;
  count: number | null;
  selected: boolean;
  onToggle: () => void;
}

function PlatformSectionFrame({
  label,
  section,
  platform,
  count,
  selected,
  onToggle
}: PlatformSectionFrameProps) {
  const url = sectionUrl(section, platform.url);
  const placeholder = 'unavailable' in section ? section.unavailable : 'Not available yet';

  return (
    <section
      onClick={onToggle}
      className={cn(
        'border-border bg-card/60 hover:border-foreground/30 flex min-h-0 cursor-pointer flex-col overflow-hidden rounded-xl border transition-colors',
        selected && 'border-primary hover:border-primary ring-primary/30 ring-2'
      )}
    >
      <header className='flex h-9 shrink-0 items-center justify-between gap-2 border-b pr-1.5'>
        <button
          type='button'
          aria-pressed={selected}
          className={cn(
            'flex h-full flex-1 items-center gap-2 px-3 text-left text-sm font-medium outline-none focus-visible:underline',
            selected && 'text-primary'
          )}
        >
          {label}
          {count !== null ? (
            <span className='text-muted-foreground text-xs font-normal'>{count}</span>
          ) : null}
        </button>
        {url ? (
          <a
            href={url}
            target='_blank'
            rel='noopener noreferrer'
            aria-label={`Open ${platform.label} ${label}`}
            title={url}
            onClick={(event) => event.stopPropagation()}
            className='text-muted-foreground hover:bg-accent/50 hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors'
          >
            <Icons.externalLink className='size-4' stroke={1.5} />
          </a>
        ) : null}
      </header>
      {url ? (
        <FittedPreview
          url={url}
          title={`${platform.label} ${label} preview`}
          className='m-2 min-h-0 flex-1 border-border/60'
        />
      ) : (
        <div className='text-muted-foreground m-2 flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs'>
          {placeholder}
        </div>
      )}
    </section>
  );
}

function FeatureItem({ feature }: { feature: PlatformFeature }) {
  return (
    <li className='border-border bg-card/60 rounded-xl border p-3'>
      <div className='flex items-start gap-3'>
        <FeatureIcon icon={feature.icon} />
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
            <span className='text-sm font-medium'>{feature.name}</span>
            <FeatureStatusBadge status={feature.status} className='h-5 px-1.5 text-[11px]' />
          </div>
          <p className='text-muted-foreground text-xs leading-snug'>{feature.description}</p>
        </div>
      </div>
      <ServiceBadges services={feature.services} className='mt-2.5 pl-11' />
    </li>
  );
}
