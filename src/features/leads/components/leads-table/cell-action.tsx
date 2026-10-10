'use client';

import { useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import type { Lead } from '../../api/types';
import { LeadFormSheet } from '../lead-form-sheet';

interface CellActionProps {
  data: Lead;
}

export function CellAction({ data }: CellActionProps) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      {editOpen ? <LeadFormSheet lead={data} open onOpenChange={setEditOpen} /> : null}
      <Button
        variant='ghost'
        size='icon'
        className='h-8 w-8'
        aria-label={`Edit ${data.name ?? data.email}`}
        onClick={() => setEditOpen(true)}
      >
        <Icons.edit className='h-4 w-4' />
      </Button>
    </>
  );
}
