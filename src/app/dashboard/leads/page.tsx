import type { SearchParams } from 'nuqs/server';
import PageContainer from '@/components/layout/page-container';
import { leadsInfoContent } from '@/config/infoconfig';
import LeadListing from '@/features/leads/components/lead-listing';
import { leadsSearchParamsCache } from '@/features/leads/constants/search-params';

export const metadata = {
  title: 'Dashboard: Leads'
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function LeadsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  leadsSearchParamsCache.parse(searchParams);

  return (
    <PageContainer
      pageTitle='Leads'
      pageDescription='Potential users captured from IAteneo guests and invited panelists'
      infoContent={leadsInfoContent}
    >
      <LeadListing />
    </PageContainer>
  );
}
