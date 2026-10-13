import { queryOptions } from '@tanstack/react-query';
import { getKnowledgeBase, getKnowledgeImages } from './service';

export const knowledgeBaseKeys = {
  all: ['knowledge-base'] as const,
  base: () => [...knowledgeBaseKeys.all, 'base'] as const,
  images: () => [...knowledgeBaseKeys.all, 'images'] as const
};

export const knowledgeBaseQueryOptions = () =>
  queryOptions({
    queryKey: knowledgeBaseKeys.base(),
    queryFn: getKnowledgeBase
  });

export const knowledgeImagesQueryOptions = () =>
  queryOptions({
    queryKey: knowledgeBaseKeys.images(),
    queryFn: getKnowledgeImages
  });
