'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { Icons } from '@/components/icons';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { BrandLogo } from '@/features/architecture/components/brand-logo';
import { platformNodesById, sectionLabels } from '@/features/platform-features/constants/options';
import type { BillingFeatureOption } from '../api/types';

interface FeatureGroup {
  key: string;
  label: string;
  features: BillingFeatureOption[];
}

interface PlatformGroup {
  platformId: string;
  sections: FeatureGroup[];
  features: BillingFeatureOption[];
}

function groupFeatures(features: BillingFeatureOption[]): PlatformGroup[] {
  const platforms = new Map<string, PlatformGroup>();
  for (const feature of features) {
    let platform = platforms.get(feature.platformId);
    if (!platform) {
      platform = { platformId: feature.platformId, sections: [], features: [] };
      platforms.set(feature.platformId, platform);
    }
    platform.features.push(feature);
    let section = platform.sections.find((group) => group.key === feature.section);
    if (!section) {
      section = {
        key: feature.section,
        label: sectionLabels.get(feature.section) ?? feature.section,
        features: []
      };
      platform.sections.push(section);
    }
    section.features.push(feature);
  }
  return [...platforms.values()];
}

function GroupCheckbox({
  features,
  selected,
  onToggle,
  label
}: {
  features: BillingFeatureOption[];
  selected: ReadonlySet<string>;
  onToggle: (ids: string[], include: boolean) => void;
  label: string;
}) {
  const count = features.filter((feature) => selected.has(feature.id)).length;
  return (
    <Checkbox
      checked={count > 0 && count === features.length}
      indeterminate={count > 0 && count < features.length}
      onCheckedChange={(checked) =>
        onToggle(
          features.map((feature) => feature.id),
          checked
        )
      }
      aria-label={`Select all of ${label}`}
    />
  );
}

interface FeaturePickerProps {
  features: BillingFeatureOption[];
  value: string[];
  onChange: (value: string[]) => void;
}

export function FeaturePicker({ features, value, onChange }: FeaturePickerProps) {
  const [search, setSearch] = useState('');
  const query = useDeferredValue(search.trim().toLowerCase());
  const selected = useMemo(() => new Set(value), [value]);
  const groups = useMemo(
    () =>
      groupFeatures(
        query ? features.filter((feature) => feature.name.toLowerCase().includes(query)) : features
      ),
    [features, query]
  );

  const toggle = (ids: string[], include: boolean) => {
    const next = new Set(selected);
    for (const id of ids) {
      if (include) next.add(id);
      else next.delete(id);
    }
    onChange([...next]);
  };

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center gap-2'>
        <div className='relative flex-1'>
          <Icons.search className='text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2' />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Search features...'
            className='pl-8'
          />
        </div>
        <span className='text-muted-foreground text-xs whitespace-nowrap tabular-nums'>
          {value.length} of {features.length} selected
        </span>
      </div>
      <div className='max-h-96 overflow-y-auto rounded-lg border'>
        {groups.length ? null : (
          <p className='text-muted-foreground p-4 text-center text-sm'>No features match.</p>
        )}
        {groups.map((platform) => {
          const node = platformNodesById.get(platform.platformId);
          const label = node?.data.label ?? platform.platformId;
          return (
            <div key={platform.platformId} className='border-b last:border-b-0'>
              <div className='bg-muted/60 sticky top-0 z-10 flex items-center gap-2 px-3 py-2 backdrop-blur'>
                <GroupCheckbox
                  features={platform.features}
                  selected={selected}
                  onToggle={toggle}
                  label={label}
                />
                {node?.data.logo ? (
                  <BrandLogo logo={node.data.logo} logoDark={node.data.logoDark} size={18} />
                ) : null}
                <span className='text-sm font-semibold'>{label}</span>
              </div>
              {platform.sections.map((section) => (
                <div key={section.key} className='px-3 py-2'>
                  <div className='mb-1.5 flex items-center gap-2'>
                    <GroupCheckbox
                      features={section.features}
                      selected={selected}
                      onToggle={toggle}
                      label={`${label} ${section.label}`}
                    />
                    <span className='text-muted-foreground text-xs font-medium uppercase'>
                      {section.label}
                    </span>
                  </div>
                  <div className='grid gap-1.5 pl-6 sm:grid-cols-2'>
                    {section.features.map((feature) => (
                      <label
                        key={feature.id}
                        className='hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm'
                      >
                        <Checkbox
                          checked={selected.has(feature.id)}
                          onCheckedChange={(checked) => toggle([feature.id], checked)}
                        />
                        <span className='truncate'>{feature.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
