import PageContainer from '@/components/layout/page-container';
import { agentsInfoContent } from '@/config/infoconfig';
import { AgentFormSheetTrigger } from '@/features/platform-agents/components/agent-form-sheet';
import AgentListing from '@/features/platform-agents/components/agent-listing';

export const metadata = {
  title: 'Dashboard: Agents'
};

export default function AgentsPage() {
  return (
    <PageContainer
      pageTitle='Agents'
      pageDescription='AI agents of every platform, shared with the architecture map'
      infoContent={agentsInfoContent}
      pageHeaderAction={<AgentFormSheetTrigger />}
    >
      <AgentListing />
    </PageContainer>
  );
}
