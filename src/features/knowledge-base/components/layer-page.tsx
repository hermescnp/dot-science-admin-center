'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { AlertModal } from '@/components/modal/alert-modal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { knowledgeBaseKeys } from '../api/queries';
import { deleteLayer } from '../api/service';
import type { KnowledgeLayer } from '../api/types';
import { Markdown, markdownHeadings } from './markdown';

const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });
const BLOCK_HASH = /^#(blk_[a-z0-9-]+)$/;

interface LayerPageProps {
  layer: KnowledgeLayer;
  sectionTitle: string;
  onEdit: () => void;
  onDeleted: () => void;
  onLayerLink: (slug: string) => void;
}

export function LayerPage({ layer, sectionTitle, onEdit, onDeleted, onLayerLink }: LayerPageProps) {
  const queryClient = useQueryClient();
  const pageRef = useRef<HTMLDivElement>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);

  const toc = useMemo(
    () => markdownHeadings(layer.content).filter((h) => h.depth === 2 || h.depth === 3),
    [layer.content]
  );

  const deleteMutation = useMutation({
    mutationFn: () => deleteLayer(layer.id),
    onSuccess: async () => {
      setDeleteOpen(false);
      onDeleted();
      await queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.all });
      toast.success('Layer deleted');
    },
    onError: () => toast.error("Couldn't delete the layer")
  });

  useEffect(() => {
    const page = pageRef.current;
    if (!page || toc.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveHeading(visible.target.id);
      },
      { rootMargin: '0px 0px -70% 0px' }
    );
    for (const heading of toc) {
      const element = page.querySelector(`#${CSS.escape(heading.id)}`);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [toc]);

  useEffect(() => {
    function scrollToHashBlock() {
      const blockId = BLOCK_HASH.exec(window.location.hash)?.[1];
      if (!blockId) return;
      pageRef.current
        ?.querySelector(`[data-block-id="${CSS.escape(blockId)}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    scrollToHashBlock();
    window.addEventListener('hashchange', scrollToHashBlock);
    return () => window.removeEventListener('hashchange', scrollToHashBlock);
  }, []);

  function scrollToHeading(id: string) {
    const element = pageRef.current?.querySelector(`#${CSS.escape(id)}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveHeading(id);
  }

  return (
    <div ref={pageRef}>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title={`Delete “${layer.title}”?`}
        description='This layer will be permanently removed from the knowledge base.'
        confirmLabel='Delete layer'
      />
      <div className='grid grid-cols-[minmax(0,1fr)] gap-10 px-6 py-8 md:px-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,48rem)_minmax(14rem,1fr)]'>
        <article className='mx-auto w-full max-w-3xl min-w-0 xl:col-start-2'>
          <header className='mb-8 border-b pb-6'>
            <div className='flex items-start justify-between gap-4'>
              <div className='min-w-0'>
                <p className='text-primary mb-2 text-xs font-medium tracking-wider uppercase'>
                  {sectionTitle}
                </p>
                <h1 className='text-3xl font-semibold tracking-tight'>{layer.title}</h1>
              </div>
              <div className='flex shrink-0 gap-2'>
                <Button variant='outline' size='sm' onClick={onEdit}>
                  <Icons.edit className='size-4' /> Edit
                </Button>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger
                    render={<Button variant='ghost' size='sm' className='px-2' />}
                  >
                    <span className='sr-only'>More actions</span>
                    <Icons.ellipsis className='size-4' />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem onClick={onEdit}>
                      <Icons.edit className='mr-2 size-4' /> Edit layer
                    </DropdownMenuItem>
                    <DropdownMenuItem variant='destructive' onClick={() => setDeleteOpen(true)}>
                      <Icons.trash className='mr-2 size-4' /> Delete layer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {layer.summary ? (
              <p className='text-muted-foreground mt-3 text-base leading-7'>{layer.summary}</p>
            ) : null}
            <p className='text-muted-foreground mt-4 flex items-center gap-1.5 text-xs'>
              <Icons.clock className='size-3.5' />
              <span suppressHydrationWarning>
                Updated {dateFormat.format(new Date(layer.updatedAt))}
              </span>
              {layer.updatedByName ? <span>by {layer.updatedByName}</span> : null}
            </p>
          </header>

          {layer.content.trim() ? (
            <Markdown content={layer.content} onLayerLink={onLayerLink} />
          ) : (
            <p className='text-muted-foreground text-sm'>
              This layer is empty. Use Edit to start writing.
            </p>
          )}
        </article>

        {toc.length > 0 ? (
          <aside className='hidden w-full max-w-56 min-w-0 xl:col-start-3 xl:block'>
            <nav aria-label='On this page' className='sticky top-8'>
              <p className='mb-3 text-xs font-semibold tracking-wider uppercase'>On this page</p>
              <ul className='space-y-1 border-l text-sm'>
                {toc.map((heading) => (
                  <li key={heading.id}>
                    <a
                      href={`#${heading.id}`}
                      onClick={(event) => {
                        event.preventDefault();
                        scrollToHeading(heading.id);
                      }}
                      className={cn(
                        '-ml-px block border-l py-1 transition-colors',
                        heading.depth === 3 ? 'pl-6' : 'pl-3',
                        activeHeading === heading.id
                          ? 'border-primary text-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground border-transparent'
                      )}
                    >
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
