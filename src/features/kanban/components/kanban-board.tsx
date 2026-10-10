'use client';

import type { DragEndEvent, UniqueIdentifier } from '@dnd-kit/core';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { parseAsString, useQueryState } from 'nuqs';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Kanban, KanbanBoard as KanbanBoardPrimitive, KanbanOverlay } from '@/components/ui/kanban';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { featureSubtasksQueryOptions } from '@/features/feature-subtasks/api/queries';
import { platformFeaturesQueryOptions } from '@/features/platform-features/api/queries';
import type {
  PlatformFeature,
  PlatformFeatureStatus
} from '@/features/platform-features/api/types';
import {
  platformFeatureStatuses,
  platformFeatureStatusesByValue,
  platformOptions
} from '@/features/platform-features/constants/options';
import { moveFeatureMutation } from '../api/mutations';
import { ALL_PLATFORMS, kanbanFeatureFilters } from '../constants/board';
import { createRestrictToContainer } from '../utils/restrict-to-container';
import { StatusColumn } from './board-column';
import { FeatureTaskSheet } from './feature-task-sheet';
import { FeatureCard, type SubtaskProgress } from './task-card';

type Columns = Record<PlatformFeatureStatus, PlatformFeature[]>;

const platformFilterOptions = [
  { value: ALL_PLATFORMS, label: 'All platforms' },
  ...platformOptions
];

function groupByStatus(features: PlatformFeature[]): Columns {
  const columns = Object.fromEntries(
    platformFeatureStatuses.map((status) => [status.value, [] as PlatformFeature[]])
  ) as Columns;
  for (const feature of features) columns[feature.status]?.push(feature);
  return columns;
}

export function KanbanBoard() {
  const [platform, setPlatform] = useQueryState(
    'platform',
    parseAsString.withDefault(ALL_PLATFORMS).withOptions({ shallow: true })
  );
  const { data } = useSuspenseQuery(platformFeaturesQueryOptions(kanbanFeatureFilters));
  const { data: subtasks } = useSuspenseQuery(featureSubtasksQueryOptions());
  const moveMutation = useMutation(moveFeatureMutation);

  // Columns as rearranged by an in-flight drag; null shows the cached data.
  const [draft, setDraft] = useState<Columns | null>(null);
  const draggingRef = useRef(false);
  const [openFeatureId, setOpenFeatureId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- factory function, stable after mount
  const restrictToBoard = useCallback(
    createRestrictToContainer(() => containerRef.current),
    []
  );

  const columns = useMemo(
    () =>
      groupByStatus(
        platform === ALL_PLATFORMS
          ? data.features
          : data.features.filter((feature) => feature.platformId === platform)
      ),
    [data.features, platform]
  );
  const visibleColumns = draft ?? columns;

  const progressByFeature = useMemo(() => {
    const progress = new Map<string, SubtaskProgress>();
    for (const subtask of subtasks) {
      const entry = progress.get(subtask.featureId) ?? { done: 0, total: 0 };
      entry.total += 1;
      if (subtask.done) entry.done += 1;
      progress.set(subtask.featureId, entry);
    }
    return progress;
  }, [subtasks]);

  const openFeature = openFeatureId
    ? data.features.find((feature) => feature.id === openFeatureId)
    : undefined;

  function handleValueChange(next: Record<UniqueIdentifier, PlatformFeature[]>) {
    // The primitive also emits a value after drag end; only in-drag changes are drafts.
    if (draggingRef.current) setDraft(next as Columns);
  }

  function handleDragEnd(event: DragEndEvent) {
    draggingRef.current = false;
    const current = draft;
    const feature = data.features.find((item) => item.id === event.active.id);
    const status = current
      ? platformFeatureStatuses.find((column) =>
          current[column.value].some((item) => item.id === event.active.id)
        )?.value
      : undefined;

    if (!event.over || !feature || !status || status === feature.status) {
      setDraft(null);
      return;
    }

    moveMutation.mutate(
      { feature, status },
      {
        onSuccess: () =>
          toast.success(`Moved to ${platformFeatureStatusesByValue.get(status)?.label}`),
        onError: () => toast.error("Couldn't move the feature. Try again."),
        onSettled: () => setDraft(null)
      }
    );
  }

  function handleDragCancel() {
    draggingRef.current = false;
    setDraft(null);
  }

  return (
    <div className='flex flex-col gap-4'>
      <Select
        items={platformFilterOptions}
        value={platform}
        onValueChange={(value) => setPlatform(value === ALL_PLATFORMS ? null : value)}
      >
        <SelectTrigger className='w-56' aria-label='Filter by platform'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {platformFilterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <div ref={containerRef}>
        <Kanban
          value={visibleColumns}
          onValueChange={handleValueChange}
          getItemValue={(item) => item.id}
          modifiers={[restrictToBoard]}
          autoScroll={false}
          onDragStart={() => {
            draggingRef.current = true;
          }}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className='w-full overflow-x-auto rounded-md pb-4'>
            <KanbanBoardPrimitive className='flex flex-col items-start gap-4 md:flex-row'>
              {platformFeatureStatuses.map((status) => (
                <StatusColumn
                  key={status.value}
                  value={status.value}
                  features={visibleColumns[status.value]}
                  progressByFeature={progressByFeature}
                  onOpenFeature={setOpenFeatureId}
                />
              ))}
            </KanbanBoardPrimitive>
          </div>
          <KanbanOverlay>
            {({ value, variant }) => {
              if (variant === 'column') return null;
              const feature = data.features.find((item) => item.id === value);
              if (!feature) return null;
              return <FeatureCard feature={feature} progress={progressByFeature.get(feature.id)} />;
            }}
          </KanbanOverlay>
        </Kanban>
      </div>

      <FeatureTaskSheet
        feature={openFeature}
        open={!!openFeature}
        onOpenChange={(open) => {
          if (!open) setOpenFeatureId(null);
        }}
      />
    </div>
  );
}
