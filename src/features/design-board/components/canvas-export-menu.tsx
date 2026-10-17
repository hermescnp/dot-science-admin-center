'use client';

import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { BinaryFiles } from '@excalidraw/excalidraw/types';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { headerIconButtonClassName } from '@/components/layout/header-icon-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const EXPORT_PADDING = 24;

export interface ExportableScene {
  elements: readonly ExcalidrawElement[];
  files: BinaryFiles;
}

interface CanvasExportMenuProps {
  /** Null while the canvas is still loading. */
  getScene: (() => ExportableScene) | null;
  fileName: string;
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function CanvasExportMenu({ getScene, fileName }: CanvasExportMenuProps) {
  async function exportScene(format: 'png' | 'svg' | 'clipboard') {
    if (!getScene) return;
    const { elements, files } = getScene();
    if (elements.length === 0) {
      toast.info('The canvas is empty, there is nothing to export.');
      return;
    }
    // Excalidraw touches `window` on import, so it is only loaded on demand.
    const { exportToBlob, exportToSvg, exportToClipboard } = await import('@excalidraw/excalidraw');
    const options = {
      elements,
      files,
      exportPadding: EXPORT_PADDING,
      appState: {
        exportBackground: true,
        viewBackgroundColor: '#ffffff',
        exportWithDarkMode: false
      }
    };
    try {
      if (format === 'png') {
        download(await exportToBlob({ ...options, mimeType: 'image/png' }), `${fileName}.png`);
      } else if (format === 'svg') {
        const svg = await exportToSvg(options);
        download(new Blob([svg.outerHTML], { type: 'image/svg+xml' }), `${fileName}.svg`);
      } else {
        await exportToClipboard({ ...options, type: 'png' });
        toast.success('Image copied to the clipboard');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not export the image');
    }
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <button
                  type='button'
                  aria-label='Export'
                  disabled={!getScene}
                  className={headerIconButtonClassName(
                    'disabled:pointer-events-none disabled:opacity-40'
                  )}
                />
              }
            />
          }
        >
          <Icons.download stroke={1.5} />
        </TooltipTrigger>
        <TooltipContent side='bottom'>Export</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align='end' className='w-auto min-w-52'>
        <DropdownMenuItem onClick={() => void exportScene('png')}>
          <Icons.photo className='size-4' />
          Export as PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void exportScene('svg')}>
          <Icons.photo className='size-4' />
          Export as SVG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void exportScene('clipboard')}>
          <Icons.copy className='size-4' />
          Copy image to clipboard
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
