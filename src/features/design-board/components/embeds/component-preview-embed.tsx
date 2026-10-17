'use client';

import { useQuery } from '@tanstack/react-query';
import { designComponentsQueryOptions } from '../../api/queries';
import {
  ComponentPreviewFrame,
  ComponentPreviewSkeleton
} from '../interface/component-preview-frame';
import { EmbedLoading, EmbedNotice } from './embed-notice';

interface ComponentPreviewEmbedProps {
  componentId: string;
  className?: string;
}

/** A design component's current interactive preview. */
export function ComponentPreviewEmbed({ componentId, className }: ComponentPreviewEmbedProps) {
  const { data: components, isPending } = useQuery(designComponentsQueryOptions());
  if (isPending) return <EmbedLoading className={className} />;
  const component = components?.find((candidate) => candidate.id === componentId);
  if (!component) {
    return <EmbedNotice className={className}>This component no longer exists</EmbedNotice>;
  }
  if (component.previewStatus === 'pending') {
    return (
      <div className={className}>
        <ComponentPreviewSkeleton previousHtml={component.previewHtml} />
      </div>
    );
  }
  if (!component.previewHtml) {
    return (
      <EmbedNotice className={className}>
        {component.previewStatus === 'error'
          ? `The preview of ${component.name} failed to generate`
          : `${component.name} has no preview yet`}
      </EmbedNotice>
    );
  }
  return (
    <div className={className}>
      <ComponentPreviewFrame html={component.previewHtml} />
    </div>
  );
}
