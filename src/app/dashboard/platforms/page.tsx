import PageContainer from '@/components/layout/page-container';
import { platformsInfoContent } from '@/config/infoconfig';
import { PlatformsTable } from '@/features/platforms/components/platforms-table';

export const metadata = {
  title: 'Dashboard: Platforms'
};

export default function PlatformsPage() {
  return (
    <PageContainer
      pageTitle='Platforms'
      pageDescription='Every platform on the architecture map and its sections'
      infoContent={platformsInfoContent}
    >
      <PlatformsTable />
    </PageContainer>
  );
}
