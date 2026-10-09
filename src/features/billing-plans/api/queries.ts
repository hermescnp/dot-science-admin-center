import { queryOptions } from '@tanstack/react-query';
import { getBillingPlans } from './service';

export const billingPlanKeys = {
  all: ['billing-plans'] as const,
  list: () => [...billingPlanKeys.all, 'list'] as const
};

export const billingPlansQueryOptions = () =>
  queryOptions({
    queryKey: billingPlanKeys.list(),
    queryFn: getBillingPlans
  });
