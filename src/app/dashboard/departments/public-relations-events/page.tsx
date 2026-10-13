import PageContainer from '@/components/layout/page-container';
import { SocialComposer } from '@/features/social-composer/components/social-composer';

export const metadata = {
  title: 'Dashboard: Public Relations & Events'
};

export default function PublicRelationsEventsPage() {
  return (
    <PageContainer
      pageTitle='Public Relations & Events'
      pageDescription='Plan a social media publication and preview it on every platform'
    >
      <SocialComposer />
    </PageContainer>
  );
}
