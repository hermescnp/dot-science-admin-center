'use client';

import { createContext, use, useRef, useState } from 'react';
import type { SpaceZone } from '../api/types';
import { useHistory } from './use-history';

export interface PlaceHover {
  key: string | null;
  name: string | null;
}

interface ExperienceContextValue {
  placehover: PlaceHover;
  setPlaceHover: React.Dispatch<React.SetStateAction<PlaceHover>>;
  history: string[];
  pushToHistory: (item: string) => void;
  stepBackHistory: () => void;
  getLastHistoryItem: () => string;
  getPrevHistoryItem: () => string;
  spaceData: SpaceZone[];
  isInfoPanelExpanded: boolean;
  setIsInfoPanelExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  isSearchBarActive: boolean;
  setIsSearchBarActive: React.Dispatch<React.SetStateAction<boolean>>;
  isPortraitMode: boolean;
  setIsPortraitMode: React.Dispatch<React.SetStateAction<boolean>>;
  isCursorTargeting: boolean;
  setIsCursorTargeting: React.Dispatch<React.SetStateAction<boolean>>;
  /** DOM frames of the iframe screens, keyed by screen id, positioned by the canvas trackers. */
  screenFramesRef: React.RefObject<Map<string, HTMLDivElement>>;
}

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

interface ExperienceProviderProps {
  spaceData: SpaceZone[];
  children: React.ReactNode;
}

export function ExperienceProvider({ spaceData, children }: ExperienceProviderProps) {
  const [placehover, setPlaceHover] = useState<PlaceHover>({ key: '', name: '' });
  const { history, pushToHistory, stepBackHistory, getLastHistoryItem, getPrevHistoryItem } =
    useHistory();
  const [isInfoPanelExpanded, setIsInfoPanelExpanded] = useState(false);
  const [isSearchBarActive, setIsSearchBarActive] = useState(false);
  const [isPortraitMode, setIsPortraitMode] = useState(false);
  const [isCursorTargeting, setIsCursorTargeting] = useState(false);
  const screenFramesRef = useRef(new Map<string, HTMLDivElement>());

  return (
    <ExperienceContext
      value={{
        placehover,
        setPlaceHover,
        history,
        pushToHistory,
        stepBackHistory,
        getLastHistoryItem,
        getPrevHistoryItem,
        spaceData,
        isInfoPanelExpanded,
        setIsInfoPanelExpanded,
        isSearchBarActive,
        setIsSearchBarActive,
        isPortraitMode,
        setIsPortraitMode,
        isCursorTargeting,
        setIsCursorTargeting,
        screenFramesRef
      }}
    >
      {children}
    </ExperienceContext>
  );
}

export function useExperienceContext(): ExperienceContextValue {
  const context = use(ExperienceContext);
  if (!context) {
    throw new Error('useExperienceContext must be used within ExperienceProvider');
  }
  return context;
}
