import React from 'react';
import { Icons } from '@/components/icons';

interface NavInstanceProps {
  key?: React.Key;
  instanceName: string;
  HandleInstanceClick: () => void;
  HandleInstanceNameEnter: () => void;
  HandleInstanceNameLeave: () => void;
}

export const NavInstance: React.FC<NavInstanceProps> = ({
  instanceName,
  HandleInstanceClick,
  HandleInstanceNameEnter,
  HandleInstanceNameLeave
}) => {
  return (
    <div
      className='NavigationInstance'
      onClick={HandleInstanceClick}
      onMouseEnter={HandleInstanceNameEnter}
      onMouseLeave={HandleInstanceNameLeave}
    >
      <Icons.cube stroke={1.5} className='text-muted-foreground size-[18px] shrink-0' />
      <button type='button' className='InstanceButton' onClick={HandleInstanceClick}>
        {instanceName}
      </button>
    </div>
  );
};
