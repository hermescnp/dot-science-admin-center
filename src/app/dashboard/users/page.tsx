import type { SearchParams } from 'nuqs/server';
import PageContainer from '@/components/layout/page-container';
import UserListingPage from '@/features/users/components/user-listing';
import { usersSearchParamsCache } from '@/features/users/constants/search-params';
import { usersInfoContent } from '@/features/users/info-content';

export const metadata = {
  title: 'Dashboard: Users'
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function UsersPage(props: PageProps) {
  const searchParams = await props.searchParams;
  usersSearchParamsCache.parse(searchParams);

  return (
    <PageContainer
      pageTitle='Users'
      pageDescription='Everyone with an account across the platforms, with their workspaces, activity and plan'
      infoContent={usersInfoContent}
    >
      <UserListingPage />
    </PageContainer>
  );
}
