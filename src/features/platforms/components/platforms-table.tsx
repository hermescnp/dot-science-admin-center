'use client';

import { useState } from 'react';
import { Icons } from '@/components/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { BrandLogo } from '@/features/architecture/components/brand-logo';
import { FittedPreview } from '@/features/architecture/components/fitted-preview';
import { PlatformDetailDialog } from '@/features/architecture/components/platform-detail-dialog';
import type { ArchitectureNodeData } from '@/features/architecture/data/architecture-graph';
import {
  platformSectionOrder,
  platformSections,
  sectionUrl,
  type PlatformSection
} from '@/features/architecture/data/platform-details';
import { platformNodes } from '@/features/platform-features/constants/options';
import { cn } from '@/lib/utils';

const [mainSection, ...sideSections] = platformSectionOrder;

export function PlatformsTable() {
  const [platformId, setPlatformId] = useState<string | null>(null);

  return (
    <>
      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='px-4'>Platform</TableHead>
              <TableHead>{mainSection.label}</TableHead>
              {sideSections.map((section) => (
                <TableHead key={section.id}>{section.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {platformNodes.map((node) => {
              const sections = platformSections[node.id];
              return (
                <TableRow
                  key={node.id}
                  onClick={() => setPlatformId(node.id)}
                  className={cn('cursor-pointer', node.data.planned && 'opacity-60')}
                >
                  <TableCell className='w-72 min-w-64 px-4 align-top whitespace-normal'>
                    <PlatformSummary data={node.data} />
                  </TableCell>
                  <TableCell className='align-top'>
                    {sections ? (
                      <SectionPreview
                        label={mainSection.label}
                        section={sections[mainSection.id]}
                        platform={node.data}
                        className='h-[250px] w-[400px]'
                      />
                    ) : null}
                  </TableCell>
                  {sideSections.map((section) => (
                    <TableCell key={section.id} className='align-top'>
                      {sections ? (
                        <SectionPreview
                          label={section.label}
                          section={sections[section.id]}
                          platform={node.data}
                          className='h-[140px] w-[220px]'
                        />
                      ) : null}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <PlatformDetailDialog
        platformId={platformId}
        open={platformId !== null}
        onOpenChange={(open) => {
          if (!open) setPlatformId(null);
        }}
      />
    </>
  );
}

function PlatformSummary({ data }: { data: ArchitectureNodeData }) {
  return (
    <div className='flex items-start gap-3 py-1'>
      {data.logo ? <BrandLogo logo={data.logo} logoDark={data.logoDark} size={36} /> : null}
      <div className='min-w-0 flex-1'>
        <span className='text-sm font-semibold'>{data.label}</span>
        <p className='text-muted-foreground mt-1 text-xs leading-snug'>{data.description}</p>
        {data.url ? (
          <p className='text-muted-foreground/80 mt-0.5 truncate font-mono text-[11px]'>
            {new URL(data.url).host}
          </p>
        ) : null}
      </div>
      {data.url ? <ExternalLink url={data.url} label={`Open ${data.label} website`} /> : null}
    </div>
  );
}

interface SectionPreviewProps {
  label: string;
  section: PlatformSection;
  platform: ArchitectureNodeData;
  className: string;
}

function SectionPreview({ label, section, platform, className }: SectionPreviewProps) {
  const url = platform.planned ? null : sectionUrl(section, platform.url);
  const placeholder = 'unavailable' in section ? section.unavailable : 'Not available yet';

  return url ? (
    <div className='relative'>
      <FittedPreview
        url={url}
        title={`${platform.label} ${label} preview`}
        className={cn('border-border/60', className)}
      />
      <div className='bg-background/90 absolute top-1.5 right-1.5 rounded-md shadow-sm'>
        <ExternalLink url={url} label={`Open ${platform.label} ${label}`} />
      </div>
    </div>
  ) : (
    <div
      className={cn(
        'text-muted-foreground flex items-center justify-center rounded-lg border border-dashed p-3 text-center text-xs whitespace-normal',
        className
      )}
    >
      {placeholder}
    </div>
  );
}

function ExternalLink({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={label}
      title={url}
      onClick={(event) => event.stopPropagation()}
      className='text-muted-foreground hover:bg-accent/50 hover:text-foreground flex size-6 shrink-0 items-center justify-center rounded-md transition-colors'
    >
      <Icons.externalLink className='size-4' stroke={1.5} />
    </a>
  );
}
