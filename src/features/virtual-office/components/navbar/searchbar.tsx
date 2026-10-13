import React, { useState, useEffect, useRef } from 'react';
import { useExperienceContext } from '../../context/experience-context';
import { Icons } from '@/components/icons';
import type { SpaceZone } from '../../api/types';
import { navbarIconButtonClassName } from './options-menu';
import '../../styles/Searchbar.css';

type ResultItem = Pick<SpaceZone, 'key' | 'name' | 'description' | 'documentation'>;

const Searchbar: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const { isSearchBarActive, setIsSearchBarActive, spaceData, pushToHistory, getLastHistoryItem } =
    useExperienceContext();
  const instanceInput = useRef<HTMLInputElement>(null);
  const [resultList, setResultList] = useState<ResultItem[]>([]);

  const handleSearchButtonClick = () => {
    setIsSearchBarActive(false);
  };

  useEffect(() => {
    const currentInstanceKey = getLastHistoryItem();
    if (!spaceData) return;
    if (inputValue === '') {
      setResultList([]);
      return;
    }
    const searchInput = inputValue.toLowerCase();
    const newResults = spaceData
      .map((item) => {
        const matchedInName = item.name.toLowerCase().includes(searchInput);
        const matchedInDesc = item.description.toLowerCase().includes(searchInput);
        const matchedInDoc = item.documentation?.toLowerCase().includes(searchInput);
        return {
          ...item,
          priority: matchedInName ? 1 : matchedInDesc ? 2 : matchedInDoc ? 3 : 999
        };
      })
      .filter((item) => item.priority !== 999 && item.key !== currentInstanceKey)
      .sort((a, b) => a.priority - b.priority);
    setResultList(newResults);
  }, [inputValue]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const trimmedValue = value.replace(/^ +/g, ''); // Remove leading spaces
    setInputValue(trimmedValue);
  };

  useEffect(() => {
    if (isSearchBarActive) {
      setResultList([]);
      instanceInput.current?.focus();
    } else {
      setInputValue('');
      instanceInput.current?.blur();
    }
  }, [isSearchBarActive]);

  const handleBlur = () => {
    setTimeout(() => {
      setIsSearchBarActive(false);
    }, 300);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (resultList.length > 0) {
        pushToHistory(resultList[0].key);
      }
      setIsSearchBarActive(false);
    }
  };

  const handleSearchResultClick = (itemKey: string, itemName: string) => {
    setInputValue(itemName);
    pushToHistory(itemKey);
  };

  return (
    <>
      <div className={'searchbar-submit-button' + (!isSearchBarActive ? ' inactive' : '')}>
        <button
          type='button'
          aria-label='Close search'
          className={navbarIconButtonClassName(isSearchBarActive)}
          onClick={handleSearchButtonClick}
        >
          <Icons.search stroke={1.5} />
        </button>
      </div>
      <div
        className={'searchbar-results-wrapper' + (!isSearchBarActive ? ' searchbar-collapsed' : '')}
      >
        <div className='searchbar-container'>
          <input
            ref={instanceInput}
            type='text'
            placeholder='Search Places or Objects'
            className='InstanceInput'
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className='searchbar-results'>
          {resultList.map((result, index) => (
            <div
              key={index}
              className='searchbar-result-item'
              onMouseDown={() => handleSearchResultClick(result.key, result.name)}
            >
              <Icons.cube stroke={1.5} className='text-muted-foreground size-[18px] shrink-0' />
              <div className='searchbar-result-text'>
                <p>{result.name}</p>
                <p className='searchbar-result-text-description'>
                  {'(' + result.description + ')'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Searchbar;
