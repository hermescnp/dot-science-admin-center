import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import '../../styles/Navbar.css';
import { NavInstance } from './nav-instance';
import { navbarIconButtonClassName, Optionsmenu } from './options-menu';
import PhantomInstance from './phantom-instance';
import { useExperienceContext } from '../../context/experience-context';
import { InstanceDocumentation } from './instance-documentation';
import type { PlaceHover } from '../../context/experience-context';

interface currentInstanceType {
  key: string;
  name: string;
  parentKey: string;
  parentName: string;
}

export function Navbar() {
  const {
    placehover,
    history,
    getLastHistoryItem,
    spaceData,
    pushToHistory,
    isInfoPanelExpanded,
    setIsInfoPanelExpanded,
    isSearchBarActive,
    setIsSearchBarActive
  } = useExperienceContext();
  const stopPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };
  const [currentInstance, setCurrentInstance] = useState<currentInstanceType>({
    key: 'main',
    name: spaceData?.find((item) => item.key === 'main')?.name ?? '',
    parentKey: 'root',
    parentName: 'root'
  });
  const [currentDocumentation, setCurrentDocumentation] = useState<string>(
    spaceData[0]?.documentation ?? ''
  );
  const [slideUpInstance, setSlideUpInstance] = useState<boolean>(false);
  const [slideDownInstance, setSlideDownInstance] = useState<boolean>(false);
  const [smoothSlide, setSmoothSlide] = useState<boolean>(true);
  const [isTraveling, setIsTraveling] = useState<boolean>(false);
  const [isHoveringNavbar, setIsHoveringNavbar] = useState<boolean>(false);
  const [paperLTRSound, setPaperLTRSound] = useState<HTMLAudioElement | null>(null);
  const [paperRTLSound, setPaperRTLSound] = useState<HTMLAudioElement | null>(null);
  const [parentPlaceHover, setParentPlaceHover] = useState<PlaceHover>({
    key: currentInstance.parentKey,
    name: currentInstance.parentName
  });
  const soundCooldownRef = useRef(false); // new ref for sound cooldown

  useEffect(() => {
    // Create audio elements when the component mounts
    setPaperLTRSound(new Audio('/virtual-office/assets/sounds/LtoR_paper.mp3'));
    setPaperRTLSound(new Audio('/virtual-office/assets/sounds/RtoL_paper.mp3'));

    // Cleanup audio resources when the component is unmounted
    return () => {
      paperLTRSound?.pause();
      paperLTRSound?.remove();
      paperRTLSound?.pause();
      paperRTLSound?.remove();
    };
  }, []);

  useEffect(() => {
    if (isInfoPanelExpanded) {
      paperLTRSound?.play();
    } else {
      paperRTLSound?.play();
    }
  }, [isInfoPanelExpanded]);

  useEffect(() => {
    if (placehover.name) {
      setSlideUpInstance(true);
    } else {
      setSlideUpInstance(false);
    }
  }, [placehover]);

  const handleBackToParent = () => {
    pushToHistory(currentInstance.parentKey);
    setSlideDownInstance(false);
  };

  const playInstanceFocusSound = () => {
    if (soundCooldownRef.current) return;
    const audio = new Audio('/virtual-office/assets/sounds/switch_effect.mp3');
    audio.volume = 0.3;
    audio.playbackRate = 3;
    audio.preservesPitch = false;
    audio.play().catch(() => {});
    soundCooldownRef.current = true;
    setTimeout(() => {
      soundCooldownRef.current = false;
    }, 500);
  };

  useEffect(() => {
    setTimeout(() => {
      if (slideUpInstance) {
        playInstanceFocusSound();
      }
    }, 100);
  }, [slideUpInstance]);

  useEffect(() => {
    setSmoothSlide(false);
    setTimeout(() => {
      setSmoothSlide(true);
    }, 100);
    setIsTraveling(true);

    // Prevent panel from auto-opening too soon or for 'main' instance
    if (!currentInstance.key || currentInstance.key === 'main') {
      return;
    }

    // Check if current instance has any children
    const instanceHasChild = spaceData?.some((item) => item.parentKey === currentInstance.key);

    // Check if current instance has documentation to show
    const currentInstanceData = spaceData?.find((item) => item.key === currentInstance.key);
    const hasDocumentation =
      currentInstanceData?.documentation && currentInstanceData.documentation.trim() !== '';

    if (!instanceHasChild && hasDocumentation) {
      setTimeout(() => {
        setIsInfoPanelExpanded(true);
      }, 2000);
    }
  }, [currentInstance, spaceData]);

  useEffect(() => {
    if (isTraveling) {
      setTimeout(() => {
        setIsTraveling(false);
      }, 2000);
    }
  }, [isTraveling]);

  useEffect(() => {
    const newLastHistoryItem = getLastHistoryItem();
    const newLastHistoryItemParent =
      spaceData?.find((item) => item.key === newLastHistoryItem)?.parentKey || '';
    setCurrentInstance({
      key: newLastHistoryItem,
      name: spaceData?.find((item) => item.key === newLastHistoryItem)?.name || '',
      parentKey: newLastHistoryItemParent,
      parentName: spaceData?.find((item) => item.key === newLastHistoryItemParent)?.name || ''
    });
    setCurrentDocumentation(
      spaceData?.find((item) => item.key === newLastHistoryItem)?.documentation || ''
    );
    setParentPlaceHover({
      key: newLastHistoryItemParent,
      name: spaceData?.find((item) => item.key === newLastHistoryItemParent)?.name || ''
    });
  }, [history, spaceData]);

  useEffect(() => {
    if (isInfoPanelExpanded) {
      setCurrentDocumentation(
        spaceData?.find((item) => item.key === currentInstance.key)?.documentation || ''
      );
    }
  }, [isInfoPanelExpanded]);

  const handleSearchButtonClick = () => {
    setIsSearchBarActive(true);
  };

  const handleInfoButtonClick = () => {
    setIsInfoPanelExpanded(!isInfoPanelExpanded);
  };

  const handleInstanceNameEnter = () => {
    setIsHoveringNavbar(true);
  };
  const handleInstanceNameLeave = () => {
    setIsHoveringNavbar(false);
  };

  return (
    <div className={'navbar-wrapper' + (isInfoPanelExpanded ? ' navbar-wrapper--expanded' : '')}>
      <div className={'Navbar-background' + (isHoveringNavbar ? ' Instance--hovered' : '')}>
        <div className={'shimmer-background' + (isTraveling ? ' --on' : ' --off')}></div>
      </div>
      <div className='NavBar' onClick={stopPropagation}>
        <div className='flex items-center justify-center'>
          <button
            type='button'
            aria-label='Back to parent space'
            disabled={currentInstance.key === 'main'}
            className={cn(
              navbarIconButtonClassName(),
              'disabled:pointer-events-none disabled:opacity-40'
            )}
            onClick={currentInstance.key !== 'main' ? handleBackToParent : undefined}
            onMouseOver={
              currentInstance.key !== 'main' ? () => setSlideDownInstance(true) : undefined
            }
            onMouseLeave={
              currentInstance.key !== 'main' ? () => setSlideDownInstance(false) : undefined
            }
          >
            <Icons.arrowBackUp stroke={1.5} />
          </button>
        </div>
        <div
          className={
            'InstanceNavigator' +
            (slideUpInstance ? ' slide-up' : '') +
            (slideDownInstance ? ' slide-down' : '') +
            (!smoothSlide ? ' no-anim' : '')
          }
        >
          <div className='InstanceNavigator-cell'>
            <PhantomInstance placehover={parentPlaceHover} />
          </div>
          <div className='InstanceNavigator-cell'>
            <NavInstance
              key={currentInstance.key}
              instanceName={currentInstance.name}
              HandleInstanceClick={handleInfoButtonClick}
              HandleInstanceNameEnter={handleInstanceNameEnter}
              HandleInstanceNameLeave={handleInstanceNameLeave}
            />
          </div>
          <div className='InstanceNavigator-cell'>
            <PhantomInstance placehover={placehover} />
          </div>
        </div>
        <Optionsmenu
          handleSearchButtonClick={handleSearchButtonClick}
          handleInfoButtonClick={handleInfoButtonClick}
          isPanelOpened={isInfoPanelExpanded}
          isSearchBarActive={isSearchBarActive}
          optionsSet='panel'
        />
      </div>
      <div id='infoPanelContent'>
        <InstanceDocumentation currentDocumentation={currentDocumentation} />
      </div>
      <button
        type='button'
        id='hideInfoPanel'
        aria-label='Close info panel'
        onClick={handleInfoButtonClick}
      >
        <Icons.chevronUp stroke={1.5} className='size-[18px]' />
      </button>
    </div>
  );
}
