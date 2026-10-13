'use client';

import { ChatStoreProvider, type ChatStoreId } from '../utils/chat-store-context';
import { Messenger } from './messenger';

export default function ChatViewPage({ storeId = 'chat' }: { storeId?: ChatStoreId }) {
  return (
    <ChatStoreProvider id={storeId}>
      <div className='flex min-h-0 flex-1 px-4 py-2 md:px-6'>
        <Messenger />
      </div>
    </ChatStoreProvider>
  );
}
