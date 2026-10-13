import PageContainer from '@/components/layout/page-container';
import { AiChatDemo } from '@/features/ai-chat/components/ai-chat-demo';

export const metadata = {
  title: 'Dashboard: Research & Development'
};

export default function ResearchDevelopmentPage() {
  return (
    <PageContainer>
      <AiChatDemo />
    </PageContainer>
  );
}
