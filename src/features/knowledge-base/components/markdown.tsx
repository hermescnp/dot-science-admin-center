'use client';

import 'katex/dist/katex.min.css';
import {
  rehypeBlockIdFromComments,
  rehypeInteractiveGraphics,
  rehypeVectorGraphics
} from '@hermescnp/content-blocks';
import GithubSlugger from 'github-slugger';
import type { Element } from 'hast';
import type { Heading, Root } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { createContext, use, type ComponentProps } from 'react';
import ReactMarkdown, {
  defaultUrlTransform,
  type Components,
  type ExtraProps
} from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { DesignEmbed } from '@/features/design-board/components/embeds/design-embed';
import { isDesignRef } from '@/features/design-board/lib/design-refs';
import { cn } from '@/lib/utils';

export interface MarkdownHeading {
  id: string;
  text: string;
  depth: number;
}

const LAYER_LINK = /^\?layer=([a-z0-9-]+)$/;
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);

function collectHeadings(tree: Root): Heading[] {
  const headings: Heading[] = [];
  const walk = (node: Root | Root['children'][number]) => {
    if (node.type === 'heading') headings.push(node);
    else if ('children' in node) node.children.forEach(walk);
  };
  walk(tree);
  return headings;
}

/** Slugs every heading in document order, so the renderer and the TOC agree on ids. */
function slugHeadings(tree: Root): { node: Heading; heading: MarkdownHeading }[] {
  const slugger = new GithubSlugger();
  return collectHeadings(tree).map((node) => {
    const text = toString(node);
    return { node, heading: { id: slugger.slug(text) || 'section', text, depth: node.depth } };
  });
}

function remarkHeadingIds() {
  return (tree: Root) => {
    for (const { node, heading } of slugHeadings(tree)) {
      node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id: heading.id } };
    }
  };
}

export function markdownHeadings(content: string): MarkdownHeading[] {
  return slugHeadings(parser.parse(content)).map(({ heading }) => heading);
}

/** Design references render as embeds, which can't sit inside a `<p>`. */
function containsDesignEmbed(node: Element): boolean {
  return node.children.some(
    (child) =>
      child.type === 'element' &&
      ((child.tagName === 'img' && isDesignRef(String(child.properties.src ?? ''))) ||
        containsDesignEmbed(child))
  );
}

function urlTransform(url: string): string {
  return isDesignRef(url) ? url : defaultUrlTransform(url);
}

const remarkPlugins = [remarkGfm, remarkMath, remarkHeadingIds];
// Block ids are stamped after KaTeX and graphics, which replace the <pre> they render.
const rehypePlugins = [
  rehypeVectorGraphics,
  rehypeInteractiveGraphics,
  [rehypeKatex, { throwOnError: false, strict: false }],
  rehypeBlockIdFromComments
] as ComponentProps<typeof ReactMarkdown>['rehypePlugins'];

const headingClass = {
  h1: 'mt-0 mb-4 text-3xl font-semibold tracking-tight',
  h2: 'mt-10 mb-3 border-b pb-2 text-xl font-semibold tracking-tight',
  h3: 'mt-8 mb-2 text-lg font-semibold',
  h4: 'mt-6 mb-2 text-base font-semibold',
  h5: 'mt-4 mb-1 text-sm font-semibold',
  h6: 'text-muted-foreground mt-4 mb-1 text-sm font-semibold'
};

function headingComponent(tag: keyof typeof headingClass): Components[typeof tag] {
  return function MarkdownHeadingTag({ node: _node, className, ...props }) {
    const Tag = tag;
    return (
      <Tag className={cn('text-foreground scroll-mt-6', headingClass[tag], className)} {...props} />
    );
  };
}

const baseComponents: Components = {
  h1: headingComponent('h1'),
  h2: headingComponent('h2'),
  h3: headingComponent('h3'),
  h4: headingComponent('h4'),
  h5: headingComponent('h5'),
  h6: headingComponent('h6'),
  p: ({ node, ...props }) =>
    node && containsDesignEmbed(node) ? (
      <div className='my-4 leading-7' {...props} />
    ) : (
      <p className='my-4 leading-7' {...props} />
    ),
  strong: ({ node: _node, ...props }) => (
    <strong className='text-foreground font-semibold' {...props} />
  ),
  blockquote: ({ node: _node, ...props }) => (
    <blockquote
      className='border-primary/60 bg-muted/30 my-5 rounded-r-md border-l-4 px-4 py-1 italic'
      {...props}
    />
  ),
  ul: ({ node: _node, className, ...props }) => (
    <ul
      className={cn(
        'my-4 space-y-1.5 pl-6',
        className?.includes('contains-task-list') ? 'list-none pl-0' : 'list-disc',
        className
      )}
      {...props}
    />
  ),
  ol: ({ node: _node, className, ...props }) => (
    <ol className={cn('my-4 list-decimal space-y-1.5 pl-6', className)} {...props} />
  ),
  li: ({ node: _node, ...props }) => <li className='leading-7' {...props} />,
  input: ({ node: _node, ...props }) => (
    <input {...props} disabled className='accent-primary mr-2 align-middle' />
  ),
  code: ({ node: _node, className, children, ...props }) => {
    const color =
      !className?.startsWith('language-') &&
      typeof children === 'string' &&
      HEX_COLOR.test(children)
        ? children
        : null;
    return (
      <code
        className={cn(
          className?.startsWith('language-')
            ? 'font-mono text-sm leading-6'
            : 'bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]',
          color && 'inline-flex items-center gap-1.5 whitespace-nowrap',
          className
        )}
        {...props}
      >
        {color ? (
          <span
            aria-hidden
            className='inline-block h-3 w-4 shrink-0 rounded-[3px] border border-black/20 dark:border-white/30'
            style={{ backgroundColor: color }}
          />
        ) : null}
        {children}
      </code>
    );
  },
  pre: ({ node: _node, ...props }) => (
    <pre className='bg-muted/50 my-5 overflow-x-auto rounded-lg border p-4' {...props} />
  ),
  img: ({ node: _node, alt, src, ...props }) =>
    typeof src === 'string' && isDesignRef(src) ? (
      <DesignEmbed src={src} alt={alt} className='my-4' />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt ?? ''} src={src} className='my-4 max-w-full rounded-lg border' {...props} />
    ),
  table: ({ node: _node, ...props }) => (
    <div className='my-5 overflow-x-auto rounded-lg border'>
      <table className='w-full text-sm' {...props} />
    </div>
  ),
  thead: ({ node: _node, ...props }) => <thead className='bg-muted/50' {...props} />,
  tr: ({ node: _node, ...props }) => <tr className='border-t first:border-t-0' {...props} />,
  th: ({ node: _node, ...props }) => (
    <th
      className='px-3 py-2 text-left align-top font-semibold [overflow-wrap:anywhere]'
      {...props}
    />
  ),
  td: ({ node: _node, ...props }) => (
    <td className='px-3 py-2 align-top [overflow-wrap:anywhere]' {...props} />
  ),
  hr: ({ node: _node, ...props }) => <hr className='my-8' {...props} />,
  figure: ({ node: _node, className, ...props }) => {
    const align = (props as Record<string, unknown>)['data-align'];
    return (
      <figure
        className={cn(
          className?.includes('vector-graphic') &&
            'my-5 w-full [&_svg]:block [&_svg]:h-auto [&_svg]:w-full',
          className?.includes('vector-graphic') &&
            (align === 'left' ? 'mr-auto' : align === 'right' ? 'ml-auto' : 'mx-auto'),
          className?.includes('interactive-graphic') &&
            'my-5 w-full [&_iframe]:block [&_iframe]:w-full [&_iframe]:border-0',
          'data-[invalid]:text-destructive data-[invalid]:rounded-md data-[invalid]:border data-[invalid]:border-dashed data-[invalid]:p-4 data-[invalid]:text-sm',
          className
        )}
        {...props}
      />
    );
  }
};

const LayerLinkContext = createContext<((slug: string) => void) | undefined>(undefined);

const linkClass = 'text-primary font-medium underline-offset-4 hover:underline';

/** `?layer=slug` links navigate inside the knowledge base; web links open in a new tab. */
function MarkdownLink({
  node: _node,
  href = '',
  children,
  ...props
}: ComponentProps<'a'> & ExtraProps) {
  const onLayerLink = use(LayerLinkContext);
  const layer = LAYER_LINK.exec(href);
  if (layer && onLayerLink) {
    return (
      <a
        {...props}
        href={href}
        className={linkClass}
        onClick={(event) => {
          event.preventDefault();
          onLayerLink(layer[1]);
        }}
      >
        {children}
      </a>
    );
  }
  const external = /^https?:\/\//.test(href);
  return (
    <a
      {...props}
      href={href}
      className={linkClass}
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
    >
      {children}
    </a>
  );
}

const components: Components = { ...baseComponents, a: MarkdownLink };

interface MarkdownProps {
  content: string;
  onLayerLink?: (slug: string) => void;
  className?: string;
}

export function Markdown({ content, onLayerLink, className }: MarkdownProps) {
  return (
    <LayerLinkContext value={onLayerLink}>
      <div
        className={cn(
          'layer-markdown text-foreground/85 text-[15px] [&_[data-block-id]]:scroll-mt-6',
          className
        )}
      >
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={components}
          urlTransform={urlTransform}
        >
          {content}
        </ReactMarkdown>
      </div>
    </LayerLinkContext>
  );
}
