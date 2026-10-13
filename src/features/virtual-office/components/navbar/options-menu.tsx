import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import '../../styles/Optionsmenu.css';

export function navbarIconButtonClassName(isActive?: boolean) {
  return cn(
    'text-muted-foreground hover:bg-accent/50 hover:text-foreground focus-visible:ring-ring/50 flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none [&_svg]:size-[18px]',
    isActive && 'bg-accent text-foreground'
  );
}

interface OptionsmenuProps {
  handleSearchButtonClick?: () => void;
  handleInfoButtonClick?: () => void;
  handleUserButtonClick?: () => void;
  isSearchBarActive?: boolean;
  isPanelOpened: boolean;
  optionsSet: 'social' | 'panel';
}

export const Optionsmenu: React.FC<OptionsmenuProps> = ({
  handleSearchButtonClick,
  handleInfoButtonClick,
  handleUserButtonClick,
  isPanelOpened,
  isSearchBarActive,
  optionsSet
}) => {
  const openLink = (link: string): any => {
    window.open(link, '_blank');
  };

  switch (optionsSet) {
    case 'social':
      return (
        <div id='SocialOptions'>
          <div id='socialMedia'>
            <div className='grid-cell'>
              <div
                className='socialMediaIcon'
                onClick={() =>
                  openLink('https://www.linkedin.com/in/hermes-concepci%C3%B3n-2ab5741b9/')
                }
              >
                <Image
                  id='linkedin'
                  className='MediaIconSrc'
                  src='/virtual-office/assets/SVG/linkedin_icon.svg'
                  width={40}
                  height={40}
                  alt='Linked in'
                />
              </div>
            </div>
            <div className='grid-cell'>
              <div
                className='socialMediaIcon'
                onClick={() => openLink('https://www.instagram.com/hermes.science/')}
              >
                <Image
                  id='instagram'
                  className='MediaIconSrc'
                  src='/virtual-office/assets/SVG/instagram_icon.svg'
                  width={40}
                  height={40}
                  alt='Instagram'
                />
              </div>
            </div>
            <div className='grid-cell'>
              <div
                className='socialMediaIcon'
                onClick={() => openLink('https://www.youtube.com/@Hermes.science')}
              >
                <Image
                  id='youtube'
                  className='MediaIconSrc'
                  src='/virtual-office/assets/SVG/youtube_icon.svg'
                  width={40}
                  height={40}
                  alt='YouTube'
                />
              </div>
            </div>
            <div className='grid-cell'>
              <div
                className='socialMediaIcon'
                onClick={() => openLink('https://twitter.com/hermesscience')}
              >
                <Image
                  id='twitter'
                  className='MediaIconSrc'
                  src='/virtual-office/assets/SVG/twitterX_icon.svg'
                  width={40}
                  height={40}
                  alt='Twitter'
                />
              </div>
            </div>
            <div className='grid-cell'>
              <div
                className='socialMediaIcon'
                onClick={() =>
                  openLink(
                    'mailto:hermes.cnp@gmail.com?subject=Contact from Hermes.science&body=Hola Hermes,'
                  )
                }
              >
                <Image
                  id='email'
                  className='MediaIconSrc'
                  src='/virtual-office/assets/SVG/email_icon.svg'
                  width={40}
                  height={40}
                  alt='E-mail'
                />
              </div>
            </div>
          </div>
        </div>
      );
    case 'panel':
      return (
        <div id='PanelOptions' className='flex items-center gap-1 pr-1'>
          <button
            type='button'
            id='infoButton'
            aria-label='Toggle info panel'
            aria-pressed={isPanelOpened}
            className={navbarIconButtonClassName(isPanelOpened)}
            onClick={handleInfoButtonClick}
          >
            <Icons.info stroke={1.5} />
          </button>
          <button
            type='button'
            id='searchButton'
            aria-label='Search places or objects'
            aria-pressed={isSearchBarActive}
            className={navbarIconButtonClassName(isSearchBarActive)}
            onClick={handleSearchButtonClick}
          >
            <Icons.search stroke={1.5} />
          </button>
        </div>
      );
    default:
      return null;
  }
};
