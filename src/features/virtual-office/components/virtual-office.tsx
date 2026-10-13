'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Inter } from 'next/font/google';
import { useSuspenseQuery } from '@tanstack/react-query';
import { HeaderPortal } from '@/components/layout/header-portal';
import { cn } from '@/lib/utils';
import { spaceMapQueryOptions } from '../api/queries';
import { ExperienceProvider, useExperienceContext } from '../context/experience-context';
import { IframeScreenFrames } from './canvas/iframe-screen';
import { CustomCursor } from './cursor';
import { LoadingOverlay } from './loading-overlay';
import { Navbar } from './navbar/navbar';
import Searchbar from './navbar/searchbar';
import { PlayTravelingSound } from './traveling-sound';
import '../styles/virtual-office.css';

const inter = Inter({ subsets: ['latin'] });

const VirtualOfficeCanvas = dynamic(() => import('./canvas/canvas'), { ssr: false });

export default function VirtualOffice() {
  const { data: spaceData } = useSuspenseQuery(spaceMapQueryOptions());

  return (
    <ExperienceProvider spaceData={spaceData}>
      <VirtualOfficeStage />
    </ExperienceProvider>
  );
}

function VirtualOfficeStage() {
  const { setIsPortraitMode } = useExperienceContext();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isFinePointer] = useState(
    () => window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const showCursor = isFinePointer && isPointerInside;
  const handleSceneReady = useCallback(() => setIsSceneReady(true), []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setIsPortraitMode(height > width);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [setIsPortraitMode]);

  return (
    <div
      ref={rootRef}
      className={cn(
        'virtual-office h-[calc(100svh-4rem)] w-full md:h-[calc(100svh-3.5rem)]',
        showCursor && 'virtual-office--custom-cursor'
      )}
      onPointerEnter={() => setIsPointerInside(true)}
      onPointerLeave={() => setIsPointerInside(false)}
    >
      {showCursor ? <CustomCursor /> : null}
      <HeaderPortal>
        <div className='virtual-office-header'>
          <Navbar />
          <Searchbar />
        </div>
      </HeaderPortal>
      <div className={cn(inter.className, 'relative h-full w-full')}>
        <VirtualOfficeCanvas onReady={handleSceneReady} />
        <IframeScreenFrames />
      </div>
      <PlayTravelingSound />
      <LoadingOverlay isHidden={isSceneReady} />
    </div>
  );
}
