import React, { useState, useEffect } from 'react';
import { Icons } from '@/components/icons';

interface SearchBarProps {
  placehover?: PlaceHoverType;
}

type PlaceHoverType = {
  key: string | null;
  name: string | null;
};

export default function PhantomInstance({ placehover }: SearchBarProps) {
  const [blink, setBlink] = useState<boolean>(false);

  // Toggle the blink state when a phantom instance is displayed.
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (placehover?.name) {
      // Toggle blink every 500ms (adjust as needed)
      intervalId = setInterval(() => {
        setBlink((prev) => !prev);
      }, 500);
    }
    // Cleanup when the component unmounts or placehover.name changes.
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [placehover?.name]);

  return (
    <div className='NavigationInstance'>
      <Icons.cube
        stroke={1.5}
        className={`ObjectIcon-blinking size-[18px] shrink-0 ${blink ? 'blink' : ''}`}
      />
      <div className={`PhantomInstance`}>{placehover?.name}</div>
    </div>
  );
}
