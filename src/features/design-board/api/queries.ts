import { queryOptions } from '@tanstack/react-query';
import { getDesignBoard } from './service';

export const designBoardKeys = {
  all: ['design-board'] as const,
  main: () => [...designBoardKeys.all, 'main'] as const
};

export const designBoardQueryOptions = () =>
  queryOptions({
    queryKey: designBoardKeys.main(),
    queryFn: getDesignBoard,
    // The board is the source of truth while open; refetching would reset the canvas.
    staleTime: Infinity,
    refetchOnWindowFocus: false
  });
