'use client';

import { parseDesignRef } from '../../lib/design-refs';
import { ComponentPreviewEmbed } from './component-preview-embed';
import { EmbedNotice } from './embed-notice';
import { FrameEmbed } from './frame-embed';

interface DesignEmbedProps {
  /** A `design:` reference, as stored in Markdown image sources. */
  src: string;
  alt?: string;
  className?: string;
}

/** Whatever design work `src` points at, as it currently looks. */
export function DesignEmbed({ src, alt, className }: DesignEmbedProps) {
  const ref = parseDesignRef(src);
  const content = !ref ? (
    <EmbedNotice>This design reference isn&apos;t valid</EmbedNotice>
  ) : ref.kind === 'component' ? (
    <ComponentPreviewEmbed componentId={ref.componentId} />
  ) : (
    <FrameEmbed sectionId={ref.sectionId} frameId={ref.frameId} />
  );
  return (
    <figure aria-label={alt || undefined} className={className}>
      {content}
    </figure>
  );
}
