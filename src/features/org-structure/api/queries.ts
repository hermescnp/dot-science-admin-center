import { queryOptions } from '@tanstack/react-query';
import { getDepartments, getOrgProfile } from './service';

export const orgStructureKeys = {
  all: ['org-structure'] as const,
  departments: () => [...orgStructureKeys.all, 'departments'] as const,
  organization: () => [...orgStructureKeys.all, 'organization'] as const
};

export const departmentsQueryOptions = () =>
  queryOptions({
    queryKey: orgStructureKeys.departments(),
    queryFn: getDepartments
  });

export const orgProfileQueryOptions = () =>
  queryOptions({
    queryKey: orgStructureKeys.organization(),
    queryFn: getOrgProfile
  });
