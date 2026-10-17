'use client';

import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useEffect, useState } from 'react';

/** The board's active tool type, for host tools that mirror Excalidraw's selection. */
export function useActiveToolType(api: ExcalidrawImperativeAPI | null) {
  const [type, setType] = useState<string | null>(null);
  useEffect(() => {
    if (!api) return;
    setType(api.getAppState().activeTool.type);
    return api.onChange((_elements, appState) => setType(appState.activeTool.type));
  }, [api]);
  return type;
}
