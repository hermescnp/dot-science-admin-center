'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const VIEWPORT_WIDTH = 1280;

interface FittedPreviewProps {
  url: string;
  title: string;
  className?: string;
}

export function FittedPreview({ url, title, className }: FittedPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const scale = size ? size.width / VIEWPORT_WIDTH : 0;

  return (
    <div
      ref={containerRef}
      className={cn('bg-background relative overflow-hidden rounded-lg border', className)}
    >
      {size && scale > 0 ? (
        <iframe
          src={url}
          title={title}
          loading='lazy'
          tabIndex={-1}
          className='pointer-events-none absolute top-0 left-0 origin-top-left border-0'
          style={{
            width: VIEWPORT_WIDTH,
            height: size.height / scale,
            transform: `scale(${scale})`
          }}
        />
      ) : null}
    </div>
  );
}
