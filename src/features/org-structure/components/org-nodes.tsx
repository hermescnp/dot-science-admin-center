'use client';

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Icons } from '@/components/icons';
import { AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar';
import { BrandLogo } from '@/features/architecture/components/brand-logo';
import { cn } from '@/lib/utils';
import type { Department } from '../api/types';
import { DEPARTMENT_NODE_WIDTH, ROOT_NODE_WIDTH } from '../data/org-layout';
import { MemberAvatar } from './member-avatar';

export interface OrgNodeData extends Record<string, unknown> {
  department: Department | null;
  hasChildren: boolean;
}

type OrgFlowNode = Node<OrgNodeData>;

const MAX_AVATARS = 5;

function Pin({ type, position }: { type: 'source' | 'target'; position: Position }) {
  return (
    <Handle
      type={type}
      id={type === 'source' ? 'bottom' : 'top'}
      position={position}
      className='bg-muted-foreground! pointer-events-none! size-2! border-0!'
    />
  );
}

export function RootNode({ data, selected }: NodeProps<OrgFlowNode>) {
  return (
    <div
      style={{ width: ROOT_NODE_WIDTH }}
      className={cn(
        'bg-card/90 text-card-foreground flex cursor-pointer items-center gap-3 rounded-xl border p-3 shadow-sm backdrop-blur-sm transition-colors',
        selected ? 'border-primary' : 'border-primary/60 hover:border-primary'
      )}
    >
      <BrandLogo logo='/logos/apps/dot-science-ai.svg' size={36} />
      <div className='min-w-0'>
        <p className='truncate text-sm font-semibold'>Dot Science</p>
        <p className='text-muted-foreground text-xs'>Organization</p>
      </div>
      {data.hasChildren ? <Pin type='source' position={Position.Bottom} /> : null}
    </div>
  );
}

export function DepartmentNode({ data, selected }: NodeProps<OrgFlowNode>) {
  const department = data.department;
  if (!department) return null;
  const members = department.members;
  const shown = members.slice(0, MAX_AVATARS);

  return (
    <div
      style={{ width: DEPARTMENT_NODE_WIDTH }}
      className={cn(
        'bg-card/90 text-card-foreground cursor-pointer rounded-xl border p-3 shadow-sm backdrop-blur-sm transition-colors',
        selected ? 'border-primary' : 'border-border hover:border-primary/50'
      )}
    >
      <Pin type='target' position={Position.Top} />
      <div className='flex items-center gap-2'>
        {department.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={department.imageUrl}
            alt=''
            className='bg-muted/40 size-8 shrink-0 rounded-md object-contain p-0.5'
          />
        ) : (
          <div className='bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md'>
            <Icons.hierarchy className='size-4' stroke={1.75} />
          </div>
        )}
        <span className='line-clamp-2 text-sm leading-tight font-semibold'>{department.name}</span>
      </div>
      <p className='text-muted-foreground mt-1.5 line-clamp-2 min-h-8 text-xs leading-4'>
        {department.description || 'No description yet'}
      </p>
      <div className='mt-2.5 flex items-center justify-between gap-2'>
        {members.length ? (
          <AvatarGroup>
            {shown.map((member) => (
              <MemberAvatar key={member.id} member={member} />
            ))}
            {members.length > shown.length ? (
              <AvatarGroupCount className='size-6 text-[10px]'>
                +{members.length - shown.length}
              </AvatarGroupCount>
            ) : null}
          </AvatarGroup>
        ) : (
          <span className='text-muted-foreground/80 text-[11px]'>No members</span>
        )}
        <span className='text-muted-foreground text-[11px]'>
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </span>
      </div>
      {data.hasChildren ? <Pin type='source' position={Position.Bottom} /> : null}
    </div>
  );
}
