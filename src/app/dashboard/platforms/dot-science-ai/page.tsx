import PageContainer from '@/components/layout/page-container';
import { SiteOverview } from '@/features/dot-science-site/components/site-overview';

export const metadata = {
  title: 'Dashboard: Dot Science AI'
};

export default function DotScienceAiPage() {
  return (
    <PageContainer
      pageTitle='Dot Science AI'
      pageDescription='Website content: the Workspace intro and each platform with its slides'
    >
      <SiteOverview />
    </PageContainer>
  );
}
