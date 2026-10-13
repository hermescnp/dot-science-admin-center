'use client';

import { useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  BAN_REASONS,
  VISIBILITIES,
  reasonLabel,
  reportCount,
  type ModeratedItem,
  type ModerationReason
} from '../data/moderation';
import { useModeration } from './moderation-context';

export function ItemActionsMenu({ item, className }: { item: ModeratedItem; className?: string }) {
  const { actions } = useModeration();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Moderate ${item.title}`}
        className={cn(
          'flex size-7 items-center justify-center rounded-full border border-white/15 bg-[#07111d]/70 text-white/80 backdrop-blur transition-colors hover:text-white',
          className
        )}
      >
        <Icons.dots className='size-4' />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        <DropdownMenuItem onClick={() => actions.viewDetails(item.id)}>
          <Icons.eye />
          View details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => actions.copyId(item.id)}>
          <Icons.copy />
          Copy ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {item.reports.length > 0 && item.status !== 'banned' && (
          <DropdownMenuItem onClick={() => actions.dismissReports([item.id])}>
            <Icons.circleCheck />
            Dismiss reports
          </DropdownMenuItem>
        )}
        {item.status === 'banned' ? (
          <DropdownMenuItem onClick={() => actions.restore([item.id])}>
            <Icons.arrowBackUp />
            Restore item
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem variant='destructive' onClick={() => actions.ban([item.id])}>
            <Icons.gavel />
            Ban item…
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface BanDialogProps {
  count: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: ModerationReason, note: string) => void;
}

export function BanDialog({ count, open, onOpenChange, onConfirm }: BanDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <BanForm count={count} onConfirm={onConfirm} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function BanForm({
  count,
  onConfirm,
  onCancel
}: {
  count: number;
  onConfirm: BanDialogProps['onConfirm'];
  onCancel: () => void;
}) {
  const [reason, setReason] = useState<ModerationReason>('spam');
  const [note, setNote] = useState('');
  return (
    <>
      <DialogHeader>
        <DialogTitle>Ban {count === 1 ? 'this item' : `${count} items`}</DialogTitle>
        <DialogDescription>
          Banned items are hidden from the Agora for every user. You can restore them later.
        </DialogDescription>
      </DialogHeader>
      <RadioGroup
        value={reason}
        onValueChange={(value) => setReason(value as ModerationReason)}
        className='gap-1'
      >
        {BAN_REASONS.map((option) => {
          const Icon = Icons[option.icon];
          return (
            <label
              key={option.value}
              htmlFor={`ban-reason-${option.value}`}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
                reason === option.value
                  ? 'border-destructive/60 bg-destructive/10'
                  : 'hover:bg-muted'
              )}
            >
              <RadioGroupItem id={`ban-reason-${option.value}`} value={option.value} />
              <Icon className='size-4 text-muted-foreground' />
              <span className='min-w-0'>
                <span className='block text-sm font-medium'>{option.label}</span>
                <span className='block text-xs text-muted-foreground'>{option.description}</span>
              </span>
            </label>
          );
        })}
      </RadioGroup>
      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={reason === 'other' ? 'Explain why (required)' : 'Internal note (optional)'}
        rows={3}
      />
      <DialogFooter>
        <Button variant='outline' onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant='destructive'
          disabled={reason === 'other' && !note.trim()}
          onClick={() => onConfirm(reason, note.trim())}
        >
          <Icons.gavel />
          Ban {count === 1 ? 'item' : `${count} items`}
        </Button>
      </DialogFooter>
    </>
  );
}

interface BulkActionBarProps {
  count: number;
  onBan: () => void;
  onRestore: () => void;
  onDismissReports: () => void;
  onClear: () => void;
}

export function BulkActionBar({
  count,
  onBan,
  onRestore,
  onDismissReports,
  onClear
}: BulkActionBarProps) {
  return (
    <div className='sticky bottom-4 z-30 mx-auto flex w-fit max-w-[calc(100%-2rem)] flex-wrap items-center gap-2 rounded-full border border-white/15 bg-[#0b1a2b]/95 py-1.5 pr-1.5 pl-4 text-sm text-white shadow-2xl backdrop-blur'>
      <span className='font-medium tabular-nums'>{count} selected</span>
      <span className='h-4 w-px bg-white/15' />
      <Button
        size='sm'
        variant='ghost'
        className='text-white/80 hover:bg-white/10 hover:text-white'
        onClick={onDismissReports}
      >
        <Icons.circleCheck />
        Dismiss reports
      </Button>
      <Button
        size='sm'
        variant='ghost'
        className='text-white/80 hover:bg-white/10 hover:text-white'
        onClick={onRestore}
      >
        <Icons.arrowBackUp />
        Restore
      </Button>
      <Button size='sm' variant='destructive' onClick={onBan}>
        <Icons.gavel />
        Ban…
      </Button>
      <Button
        size='icon-sm'
        variant='ghost'
        aria-label='Clear selection'
        className='rounded-full text-white/60 hover:bg-white/10 hover:text-white'
        onClick={onClear}
      >
        <Icons.close />
      </Button>
    </div>
  );
}

export function ItemDetailsDialog({
  item,
  onOpenChange
}: {
  item: ModeratedItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>{item && <ItemDetails item={item} />}</DialogContent>
    </Dialog>
  );
}

function ItemDetails({ item }: { item: ModeratedItem }) {
  const visibility = VISIBILITIES.find((v) => v.value === item.visibility);
  const rows: [string, string][] = [
    ['ID', item.id],
    ['Category', item.categoryTitle],
    ['Owner', `${item.owner.name} · ${item.owner.email}`],
    [
      'Uploaded',
      formatDate(item.uploadedAt, { month: 'short', hour: 'numeric', minute: '2-digit' })
    ],
    ['Visibility', visibility?.label ?? item.visibility],
    ['Details', item.meta],
    ['Status', item.status[0].toUpperCase() + item.status.slice(1)]
  ];
  return (
    <>
      <DialogHeader>
        <DialogTitle>{item.title}</DialogTitle>
        <DialogDescription>{item.subtitle}</DialogDescription>
      </DialogHeader>
      <dl className='grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1.5 text-sm'>
        {rows.map(([label, value]) => (
          <div key={label} className='contents'>
            <dt className='text-muted-foreground'>{label}</dt>
            <dd className='min-w-0 break-words'>{value}</dd>
          </div>
        ))}
      </dl>
      <div className='space-y-1.5'>
        <p className='text-xs font-medium text-muted-foreground uppercase'>
          Reports ({reportCount(item)})
        </p>
        {item.reports.length === 0 ? (
          <p className='text-sm text-muted-foreground'>No open reports.</p>
        ) : (
          <ul className='space-y-1'>
            {item.reports.map((report) => (
              <li key={report.reason} className='flex justify-between text-sm'>
                <span>{reasonLabel(report.reason)}</span>
                <span className='text-muted-foreground tabular-nums'>×{report.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {item.ban && (
        <div className='rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm'>
          <p className='font-medium text-destructive'>
            Banned · {reasonLabel(item.ban.reason)} ·{' '}
            {formatDate(item.ban.bannedAt, { month: 'short' })}
          </p>
          {item.ban.note && <p className='mt-1 text-muted-foreground'>{item.ban.note}</p>}
        </div>
      )}
    </>
  );
}
