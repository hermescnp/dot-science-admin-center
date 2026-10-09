import { queryOptions } from '@tanstack/react-query';
import {
  getArchitectureGraph,
  getModelPricing,
  getServiceHealth,
  getServicePlans
} from './service';

export const architectureKeys = {
  all: ['architecture'] as const,
  graph: () => [...architectureKeys.all, 'graph'] as const,
  health: () => [...architectureKeys.all, 'health'] as const,
  plans: () => [...architectureKeys.all, 'plans'] as const,
  models: () => [...architectureKeys.all, 'models'] as const
};

export const serviceHealthQueryOptions = () =>
  queryOptions({
    queryKey: architectureKeys.health(),
    queryFn: getServiceHealth,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000
  });

export const architectureGraphQueryOptions = () =>
  queryOptions({
    queryKey: architectureKeys.graph(),
    queryFn: getArchitectureGraph,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false
  });

export const servicePlansQueryOptions = () =>
  queryOptions({
    queryKey: architectureKeys.plans(),
    queryFn: getServicePlans,
    staleTime: 10 * 60_000,
    retry: false
  });

export const modelPricingQueryOptions = () =>
  queryOptions({
    queryKey: architectureKeys.models(),
    queryFn: getModelPricing,
    staleTime: 60 * 60_000,
    retry: false
  });
