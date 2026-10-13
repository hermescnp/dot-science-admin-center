import PageContainer from '@/components/layout/page-container';
import { Icons } from '@/components/icons';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';

export const metadata = {
  title: 'Dashboard : Admin Center'
};

export default function Page() {
  return (
    <PageContainer
      pageTitle='Admin Center'
      pageDescription='Tools for managing the admin center itself'
    >
      <Empty className='border'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <Icons.tools />
          </EmptyMedia>
          <EmptyTitle>Under development</EmptyTitle>
          <EmptyDescription>This page is not ready yet. Check back soon.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </PageContainer>
  );
}
