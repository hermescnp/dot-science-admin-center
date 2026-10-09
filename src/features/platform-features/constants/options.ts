import { architectureNodes } from '@/features/architecture/data/architecture-graph';
import { platformSectionOrder } from '@/features/architecture/data/platform-details';
import { Icons, type Icon } from '@/components/icons';
import type { PlatformFeatureSection, PlatformFeatureStatus } from '../api/types';

export const platformFeatureStatuses: {
  value: PlatformFeatureStatus;
  label: string;
  icon: Icon;
  className: string;
}[] = [
  {
    value: 'planned',
    label: 'Planned',
    icon: Icons.circleDashed,
    className: 'text-muted-foreground'
  },
  {
    value: 'designed',
    label: 'Designed',
    icon: Icons.palette,
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
  },
  {
    value: 'in_development',
    label: 'Under development',
    icon: Icons.progress,
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
  },
  {
    value: 'developed',
    label: 'Developed',
    icon: Icons.circleCheck,
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  }
];

export const statusOptions = platformFeatureStatuses.map(({ value, label }) => ({ value, label }));

export const platformFeatureStatusesByValue = new Map(
  platformFeatureStatuses.map((status) => [status.value, status])
);

export const platformFeatureSections: { value: PlatformFeatureSection; label: string }[] = [
  { value: 'general', label: 'General' },
  ...platformSectionOrder.map((section) => ({ value: section.id, label: section.label }))
];

export const sectionLabels = new Map(
  platformFeatureSections.map((section) => [section.value, section.label])
);

export const platformNodes = architectureNodes.filter((node) => node.kind === 'app');
export const serviceNodes = architectureNodes.filter((node) => node.kind === 'service');

export const platformNodesById = new Map(platformNodes.map((node) => [node.id, node]));
export const serviceNodesById = new Map(serviceNodes.map((node) => [node.id, node]));

export const platformOptions = platformNodes.map((node) => ({
  value: node.id,
  label: node.data.label
}));

export const serviceOptions = serviceNodes.map((node) => ({
  value: node.id,
  label: node.data.label
}));
