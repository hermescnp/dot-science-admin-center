'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { LoadingOverlay } from './loading-overlay';

const stageFallback = (
  <div className='relative h-[calc(100svh-4rem)] w-full md:h-[calc(100svh-3.5rem)]'>
    <LoadingOverlay />
  </div>
);

const VirtualOffice = dynamic(() => import('./virtual-office'), {
  ssr: false,
  loading: () => stageFallback
});

export function VirtualOfficeView() {
  return (
    <Suspense fallback={stageFallback}>
      <VirtualOffice />
    </Suspense>
  );
}
