'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { servicePlansQueryOptions } from '@/features/architecture/api/queries';
import { externalServicesQueryOptions } from '@/features/external-services/api/queries';
import { stackBaseline } from '@/features/external-services/projection/projection';

/** Monthly USD of the stack with no usage; null until the maintenance data has loaded. */
export function useStackBaseline(): number | null {
  const { data } = useQuery(externalServicesQueryOptions());
  const statuses = useQuery(servicePlansQueryOptions()).data?.services;
  return useMemo(
    () => (data ? stackBaseline(data.services, data.rates, statuses) : null),
    [data, statuses]
  );
}
