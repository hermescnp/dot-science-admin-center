import type { SearchParams } from 'nuqs/server';
import PageContainer from '@/components/layout/page-container';
import { featuresInfoContent } from '@/config/infoconfig';
import { PlatformFeatureFormSheetTrigger } from '@/features/platform-features/components/platform-feature-form-sheet';
import PlatformFeatureListing from '@/features/platform-features/components/platform-feature-listing';
import { platformFeaturesSearchParamsCache } from '@/features/platform-features/constants/search-params';

export const metadata = {
  title: 'Dashboard: Features'
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function FeaturesPage(props: PageProps) {
  const searchParams = await props.searchParams;
  platformFeaturesSearchParamsCache.parse(searchParams);

  return (
    <PageContainer
      pageTitle='Features'
      pageDescription='Functionalities of every platform, shared with the architecture map'
      infoContent={featuresInfoContent}
      pageHeaderAction={<PlatformFeatureFormSheetTrigger />}
    >
      <PlatformFeatureListing />
    </PageContainer>
  );
}
