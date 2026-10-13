'use client';

import { useEffect, useRef } from 'react';
import { useExperienceContext } from '../context/experience-context';
import { isInstanceDescendant, isInstanceSibling } from '../lib/instance-analyzer';

export function PlayTravelingSound() {
  const { getLastHistoryItem, history, getPrevHistoryItem, spaceData } = useExperienceContext();
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    const current = getLastHistoryItem();
    const previous = getPrevHistoryItem();
    let soundPath = '/virtual-office/assets/sounds/travelTo_parent.mp3';
    if (isInstanceDescendant(current, previous, spaceData)) {
      soundPath = '/virtual-office/assets/sounds/travelTo_child.mp3';
    } else if (isInstanceSibling(current, previous, spaceData)) {
      soundPath = '/virtual-office/assets/sounds/travelTo_sibling.mp3';
    }

    const audio = new Audio(soundPath);
    audio.volume = 1;
    audio.play().catch((error) => console.error('Audio play failed', error));

    return () => {
      audio.pause();
      audio.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  return null;
}
