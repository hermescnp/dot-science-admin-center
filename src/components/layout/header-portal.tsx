'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { HEADER_PAGE_SLOT_ID } from './header-slot';

const subscribe = () => () => {};
const getServerSlot = () => null;

interface HeaderPortalProps {
  children: React.ReactNode;
  slotId?: string;
}

export function HeaderPortal({ children, slotId = HEADER_PAGE_SLOT_ID }: HeaderPortalProps) {
  const slot = useSyncExternalStore(
    subscribe,
    () => document.getElementById(slotId),
    getServerSlot
  );
  return slot ? createPortal(children, slot) : null;
}
