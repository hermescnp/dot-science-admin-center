import type { PlatformSectionId } from '@/features/architecture/data/platform-details';

export type PlatformFeatureSection = 'general' | PlatformSectionId;

export type PlatformFeatureStatus = 'planned' | 'designed' | 'in_development' | 'developed';

export interface PlatformFeature {
  id: string;
  /** Architecture app node id, e.g. `golden-papers`. */
  platformId: string;
  section: PlatformFeatureSection;
  slug: string;
  /** Key of `Icons`. */
  icon: string;
  name: string;
  description: string;
  /** Architecture service node ids. */
  services: string[];
  status: PlatformFeatureStatus;
  position: number;
  updatedAt: string;
}

export interface PlatformFeatureFilters {
  page: number;
  limit: number;
  search?: string;
  platforms?: string[];
  sections?: string[];
  statuses?: string[];
  sort?: string;
}

export interface PlatformFeaturesResponse {
  features: PlatformFeature[];
  total: number;
}

export interface PlatformFeatureMutationPayload {
  platformId: string;
  section: PlatformFeatureSection;
  name: string;
  description: string;
  icon: string;
  services: string[];
  status: PlatformFeatureStatus;
}
