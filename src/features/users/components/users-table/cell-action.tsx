'use client';

import { useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import type { PlatformUser } from '../../api/types';
import { UserFormSheet } from '../user-form-sheet';

interface CellActionProps {
  data: PlatformUser;
}

export function CellAction({ data }: CellActionProps) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      {editOpen ? <UserFormSheet user={data} open onOpenChange={setEditOpen} /> : null}
      <Button
        variant='ghost'
        size='icon'
        className='h-8 w-8'
        aria-label={`Edit ${data.displayName ?? data.email ?? 'user'}`}
        onClick={() => setEditOpen(true)}
      >
        <Icons.edit className='h-4 w-4' />
      </Button>
    </>
  );
}
