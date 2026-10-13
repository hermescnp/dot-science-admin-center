import ChatViewPage from '@/features/chat/components/chat-view-page';

export const metadata = {
  title: 'Dashboard: The Wisdom Table'
};

export default function WisdomTablePage() {
  return <ChatViewPage storeId='wisdomTable' />;
}
