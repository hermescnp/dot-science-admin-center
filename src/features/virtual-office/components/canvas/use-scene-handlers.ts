'use client';

import { useCallback, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { SpaceZone } from '../../api/types';
import { useExperienceContext } from '../../context/experience-context';

const DOUBLE_CLICK_THRESHOLD = 300;
const LONG_CLICK_THRESHOLD = 500;
const HOVER_DELAY = 200;
const DRAG_THRESHOLD = 5;

export default function useSceneHandlers() {
  const { pushToHistory, setPlaceHover } = useExperienceContext();

  const clickStartPos = useRef({ x: 0, y: 0 });
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onZonePointerDown = useCallback(
    (_zone: SpaceZone, e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      clickStartPos.current = { x: e.clientX, y: e.clientY };
      longClickTimer.current = setTimeout(() => {
        setPlaceHover({ key: '', name: '' });
      }, LONG_CLICK_THRESHOLD);
    },
    [setPlaceHover]
  );

  const onZonePointerUp = useCallback((_zone: SpaceZone, e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (longClickTimer.current) {
      clearTimeout(longClickTimer.current);
      longClickTimer.current = null;
    }
  }, []);

  const onZoneClick = useCallback(
    (zone: SpaceZone, e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();

      const deltaX = Math.abs(e.clientX - clickStartPos.current.x);
      const deltaY = Math.abs(e.clientY - clickStartPos.current.y);
      if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) return;

      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
      } else {
        clickTimer.current = setTimeout(() => {
          pushToHistory(zone.key);
          setPlaceHover({ key: '', name: '' });
          clickTimer.current = null;
        }, DOUBLE_CLICK_THRESHOLD);
      }
    },
    [pushToHistory, setPlaceHover]
  );

  const onZoneHover = useCallback(
    (zone: SpaceZone, _e: ThreeEvent<PointerEvent>) => {
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
      }
      hoverTimer.current = setTimeout(() => {
        setPlaceHover({ key: zone.key, name: zone.name });
      }, HOVER_DELAY);
    },
    [setPlaceHover]
  );

  const onZonePointerOut = useCallback(
    (_zone: SpaceZone, _e: ThreeEvent<PointerEvent>) => {
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
      setPlaceHover({ key: '', name: '' });
    },
    [setPlaceHover]
  );

  return { onZonePointerDown, onZonePointerUp, onZoneClick, onZoneHover, onZonePointerOut };
}
