'use client';

import { createContext, use, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { chatStores, type ChatState, type ChatStore } from './store';

const ChatStoreContext = createContext<ChatStore | null>(null);

export type ChatStoreId = keyof typeof chatStores;

export function ChatStoreProvider({ id, children }: { id: ChatStoreId; children: ReactNode }) {
  return <ChatStoreContext value={chatStores[id]}>{children}</ChatStoreContext>;
}

export function useChatStore(): ChatState;
export function useChatStore<T>(selector: (state: ChatState) => T): T;
export function useChatStore<T>(selector?: (state: ChatState) => T) {
  const store = use(ChatStoreContext);
  if (!store) throw new Error('useChatStore must be used within a ChatStoreProvider');
  return useStore(store, selector ?? ((state) => state as T));
}
