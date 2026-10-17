'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Kbd, KbdGroup } from '@/components/ui/kbd';

/** `mod` renders as ⌘ on macOS and Ctrl elsewhere; `|` separates alternative bindings. */
const SHORTCUT_GROUPS: { title: string; items: [label: string, keys: string][] }[] = [
  {
    title: 'Tools',
    items: [
      ['Hand (panning)', 'H'],
      ['Selection', 'V|1'],
      ['Rectangle', 'R|2'],
      ['Diamond', 'D|3'],
      ['Ellipse', 'O|4'],
      ['Arrow', 'A|5'],
      ['Line', 'L|6'],
      ['Draw', 'P|7'],
      ['Text', 'T|8'],
      ['Insert image', '9'],
      ['Eraser', 'E|0'],
      ['Frame', 'F'],
      ['Laser pointer', 'K'],
      ['Keep tool active', 'Q']
    ]
  },
  {
    title: 'View',
    items: [
      ['Zoom in', 'mod +'],
      ['Zoom out', 'mod -'],
      ['Reset zoom', 'mod 0'],
      ['Zoom to fit all', 'shift 1'],
      ['Zoom to selection', 'shift 2'],
      ['Pan canvas', 'space drag'],
      ['Toggle grid', "mod '"],
      ['Shortcuts', '?']
    ]
  },
  {
    title: 'Editor',
    items: [
      ['Undo', 'mod Z'],
      ['Redo', 'mod shift Z'],
      ['Select all', 'mod A'],
      ['Copy', 'mod C'],
      ['Paste', 'mod V'],
      ['Duplicate', 'mod D'],
      ['Delete', 'Del'],
      ['Group', 'mod G'],
      ['Ungroup', 'mod shift G'],
      ['Bring forward', 'mod ]'],
      ['Send backward', 'mod ['],
      ['Lock / unlock', 'mod shift L'],
      ['Flip horizontal', 'shift H'],
      ['Flip vertical', 'shift V'],
      ['Add link', 'mod K'],
      ['Copy styles', 'mod alt C'],
      ['Paste styles', 'mod alt V']
    ]
  }
];

interface CanvasShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CanvasShortcutsDialog({ open, onOpenChange }: CanvasShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[85svh] gap-5 overflow-y-auto p-6 sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Work faster on the free design canvas.</DialogDescription>
        </DialogHeader>
        <ShortcutGroups />
      </DialogContent>
    </Dialog>
  );
}

function ShortcutGroups() {
  const isMac = /mac|iphone|ipad/i.test(navigator.userAgent);
  const keyLabel = (key: string) => {
    if (key === 'mod') return isMac ? '⌘' : 'Ctrl';
    if (key === 'shift') return isMac ? '⇧' : 'Shift';
    if (key === 'alt') return isMac ? '⌥' : 'Alt';
    if (key === 'space') return 'Space';
    if (key === 'drag') return 'Drag';
    return key;
  };

  return (
    <div className='grid gap-6 sm:grid-cols-3'>
      {SHORTCUT_GROUPS.map((group) => (
        <section key={group.title} className='flex flex-col gap-2'>
          <h3 className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
            {group.title}
          </h3>
          <ul className='flex flex-col'>
            {group.items.map(([label, keys]) => (
              <li
                key={label}
                className='border-border/60 flex items-center justify-between gap-3 border-b py-1.5 last:border-b-0'
              >
                <span className='text-foreground/90 truncate'>{label}</span>
                <span className='text-muted-foreground flex shrink-0 items-center gap-1 text-xs'>
                  {keys.split('|').map((binding, index) => (
                    <span key={binding} className='flex items-center gap-1'>
                      {index > 0 ? <span>or</span> : null}
                      <KbdGroup>
                        {binding.split(' ').map((key) => (
                          <Kbd key={key}>{keyLabel(key)}</Kbd>
                        ))}
                      </KbdGroup>
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
