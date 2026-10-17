'use client';

import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import { DesignEmbed } from '@/features/design-board/components/embeds/design-embed';
import { isDesignRef } from '@/features/design-board/lib/design-refs';
import { cn } from '@/lib/utils';

/**
 * Images in the layer editor. Design references render as their live embed, inert so a click
 * selects the node (to move or delete it) instead of reaching the preview.
 */
export function LayerImageView({ node, selected }: ReactNodeViewProps) {
  const src = typeof node.attrs.src === 'string' ? node.attrs.src : '';
  const alt = typeof node.attrs.alt === 'string' ? node.attrs.alt : '';
  const title = typeof node.attrs.title === 'string' ? node.attrs.title : undefined;

  if (isDesignRef(src)) {
    return (
      <NodeViewWrapper
        data-drag-handle=''
        className={cn(
          'layer-editor-design-embed my-4 rounded-lg',
          selected && 'outline-primary/60 outline-2 outline-offset-2'
        )}
      >
        <div inert>
          <DesignEmbed src={src} alt={alt} />
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper data-drag-handle=''>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        title={title}
        className={cn('layer-editor-image', selected && 'ProseMirror-selectednode')}
      />
    </NodeViewWrapper>
  );
}
