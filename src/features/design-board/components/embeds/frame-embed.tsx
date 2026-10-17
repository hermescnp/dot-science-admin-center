'use client';

import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { designComponentsQueryOptions, designSectionsQueryOptions } from '../../api/queries';
import { SCREEN_SIZES } from '../../api/types';
import { frameScene, type FrameScene } from '../../lib/section-frames';
import { ComponentsByIdContext } from '../../lib/use-components';
import { SketchScreen } from '../interface/sketch';
import { EmbedLoading, EmbedNotice } from './embed-notice';

interface FrameEmbedProps {
  sectionId: string;
  frameId: string;
  /** Scales the frame down further so it is never taller than this. */
  maxHeight?: number;
  className?: string;
}

/** A board frame as currently drawn: its drawings over the mockup screens under it. */
export function FrameEmbed({ sectionId, frameId, maxHeight, className }: FrameEmbedProps) {
  const { data: sections, isPending } = useQuery(designSectionsQueryOptions());
  const section = sections?.find((candidate) => candidate.id === sectionId);
  const scene = useMemo(() => (section ? frameScene(section, frameId) : null), [section, frameId]);
  if (isPending) return <EmbedLoading className={className} />;
  if (!scene) return <EmbedNotice className={className}>This frame no longer exists</EmbedNotice>;
  return <FrameStage scene={scene} maxHeight={maxHeight} className={className} />;
}

/** Changes whenever the exported drawing would. */
function drawingKey({ frame, elements, files }: FrameScene, dark: boolean) {
  return [
    dark,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    Object.keys(files).join(','),
    ...elements.map((element) => `${element.id}:${element.version}`)
  ].join('|');
}

/** The board drawings clipped to the frame, as an SVG filling `container`. */
function useFrameDrawing(scene: FrameScene, dark: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef(scene);
  useEffect(() => {
    sceneRef.current = scene;
  });
  const key = drawingKey(scene, dark);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { exportToSvg } = await import('@excalidraw/excalidraw');
      const { elements, files, frame } = sceneRef.current;
      const svg = await exportToSvg({
        elements,
        files,
        exportingFrame: frame,
        exportPadding: 0,
        appState: { exportBackground: false, exportWithDarkMode: dark }
      });
      if (cancelled || !containerRef.current) return;
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.style.width = '100%';
      svg.style.height = '100%';
      containerRef.current.replaceChildren(svg);
    })().catch(() => {
      // A drawing that can't be exported leaves the screens visible on their own.
    });
    return () => {
      cancelled = true;
    };
  }, [key, dark]);

  return containerRef;
}

interface FrameStageProps {
  scene: FrameScene;
  maxHeight?: number;
  className?: string;
}

function FrameStage({ scene, maxHeight, className }: FrameStageProps) {
  const { frame } = scene;
  const { resolvedTheme } = useTheme();
  const { data: components } = useQuery(designComponentsQueryOptions());
  const byId = useMemo(
    () => new Map((components ?? []).map((component) => [component.id, component])),
    [components]
  );
  const drawingRef = useFrameDrawing(scene, resolvedTheme === 'dark');

  const boxRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    setAvailable(box.clientWidth);
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  const scale = Math.min(
    1,
    available / frame.width,
    maxHeight ? maxHeight / frame.height : Infinity
  );

  return (
    <div ref={boxRef} className={cn('w-full', className)}>
      <div
        className='bg-background ring-border relative mx-auto overflow-hidden rounded-lg ring-1'
        style={{ width: frame.width * scale, height: frame.height * scale }}
      >
        <div
          inert
          className='absolute top-0 left-0 origin-top-left'
          style={{ width: frame.width, height: frame.height, transform: `scale(${scale})` }}
        >
          <ComponentsByIdContext value={byId}>
            {scene.screenLayers.map(({ id, title, screen }) =>
              screen ? (
                <div
                  key={id}
                  className='absolute'
                  style={{
                    left: screen.x - frame.x,
                    top: screen.y - frame.y,
                    width: SCREEN_SIZES[screen.device].width
                  }}
                >
                  <SketchScreen
                    title={title}
                    screen={screen}
                    header={<div className='min-h-6' />}
                    drawnOver={scene.drawnOverLayerIds.has(id)}
                  />
                </div>
              ) : null
            )}
          </ComponentsByIdContext>
          <div ref={drawingRef} className='absolute inset-0' />
        </div>
      </div>
    </div>
  );
}
