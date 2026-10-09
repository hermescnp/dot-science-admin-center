'use client';

import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useMemo, useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { servicePlansQueryOptions } from '@/features/architecture/api/queries';
import { externalServicesQueryOptions } from '../api/queries';
import type { ExternalServicesResponse } from '../api/types';
import { defaultDrivers, projectStack, type ProjectionDrivers } from '../projection/projection';
import { ProjectionCapacity } from './projection-capacity';
import { ProjectionPlayground } from './projection-playground';

export function ProjectionButton() {
  const [open, setOpen] = useState(false);
  const { data } = useQuery(externalServicesQueryOptions());

  return (
    <>
      <Button variant='outline' size='sm' onClick={() => setOpen(true)} disabled={!data}>
        <Icons.trendingUp className='mr-2 h-4 w-4' />
        Projection
      </Button>
      {open && data ? <ProjectionDialog data={data} onOpenChange={setOpen} /> : null}
    </>
  );
}

function ProjectionDialog({
  data,
  onOpenChange
}: {
  data: ExternalServicesResponse;
  onOpenChange: (open: boolean) => void;
}) {
  const plansQuery = useQuery(servicePlansQueryOptions());
  const [drivers, setDrivers] = useState<ProjectionDrivers>(defaultDrivers);
  const deferredDrivers = useDeferredValue(drivers);
  const statuses = plansQuery.data?.services;

  const projection = useMemo(
    () => projectStack(data.services, data.rates, deferredDrivers, statuses),
    [data, statuses, deferredDrivers]
  );

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90dvh] flex-col gap-4 sm:max-w-6xl'>
        <DialogHeader>
          <DialogTitle>Maintenance projection</DialogTitle>
          <DialogDescription>
            How far the current plans stretch, and what costs look like as usage grows. Changes here
            are not saved.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue='capacity' className='min-h-0 flex-1'>
          <TabsList>
            <TabsTrigger value='capacity'>Capacity</TabsTrigger>
            <TabsTrigger value='playground'>Playground</TabsTrigger>
          </TabsList>
          <TabsContent value='capacity' className='min-h-0 overflow-y-auto'>
            <ProjectionCapacity projection={projection} drivers={deferredDrivers} />
          </TabsContent>
          <TabsContent value='playground' className='min-h-0 overflow-y-auto'>
            <ProjectionPlayground
              projection={projection}
              drivers={drivers}
              onDriversChange={setDrivers}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
