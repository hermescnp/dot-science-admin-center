'use client';

import { useState, type DragEvent } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { NodeType, UiNode } from '../../api/types';
import {
  CONTAINER_TYPES,
  createNode,
  findNode,
  findParentId,
  insertNode,
  isDescendant,
  NODE_LABELS,
  removeNode,
  updateNode
} from '../../lib/node-tree';
import { componentTone, isInstance } from '../../lib/components';
import { NODE_ICONS } from './node-icons';
import { NODE_DRAG_MIME, pressProps } from './wireframe-context';

const TREE_DRAG_MIME = 'application/x-design-tree-node';

type DropZone = 'before' | 'inside' | 'after';

interface DropTarget {
  id: string;
  zone: DropZone;
}

/** Puts `node` next to or inside `target`, in a tree that no longer contains `node`. */
function placeNode(nodes: UiNode[], node: UiNode, target: DropTarget): UiNode[] {
  if (target.zone === 'inside') return insertNode(nodes, target.id, node);
  const parentId = findParentId(nodes, target.id);
  if (parentId === undefined) return nodes;
  const siblings = parentId === null ? nodes : (findNode(nodes, parentId)?.children ?? []);
  const index = siblings.findIndex((sibling) => sibling.id === target.id);
  return insertNode(nodes, parentId, node, target.zone === 'after' ? index + 1 : index);
}

function zoneFor(event: DragEvent<HTMLElement>, container: boolean): DropZone {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = (event.clientY - rect.top) / rect.height;
  if (!container) return ratio < 0.5 ? 'before' : 'after';
  if (ratio < 0.25) return 'before';
  if (ratio > 0.75) return 'after';
  return 'inside';
}

interface StructureTreeProps {
  nodes: UiNode[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (nodes: UiNode[]) => void;
  /** The node for a library drag payload dropped under `parentId`; null when it can't go there. */
  createFromDrag: (value: string, parentId: string | null) => UiNode | null;
}

export function StructureTree({
  nodes,
  selectedId,
  onSelect,
  onChange,
  createFromDrag
}: StructureTreeProps) {
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  function handleDrop(event: DragEvent, target: DropTarget) {
    event.preventDefault();
    event.stopPropagation();
    setDropTarget(null);

    const movedId = event.dataTransfer.getData(TREE_DRAG_MIME);
    if (movedId) {
      if (movedId === target.id || isDescendant(nodes, movedId, target.id)) return;
      const moved = findNode(nodes, movedId);
      if (moved) onChange(placeNode(removeNode(nodes, movedId), moved, target));
      return;
    }

    const parentId =
      target.zone === 'inside' ? target.id : (findParentId(nodes, target.id) ?? null);
    const created = createFromDrag(event.dataTransfer.getData(NODE_DRAG_MIME), parentId);
    if (!created) return;
    onChange(placeNode(nodes, created, target));
    onSelect(created.id);
  }

  function handleRootDrop(event: DragEvent) {
    event.preventDefault();
    setDropTarget(null);
    const movedId = event.dataTransfer.getData(TREE_DRAG_MIME);
    if (movedId) {
      const moved = findNode(nodes, movedId);
      if (moved) onChange(insertNode(removeNode(nodes, movedId), null, moved));
      return;
    }
    const created = createFromDrag(event.dataTransfer.getData(NODE_DRAG_MIME), null);
    if (!created) return;
    onChange(insertNode(nodes, null, created));
    onSelect(created.id);
  }

  return (
    <div
      className='pb-1'
      onDragOver={(event) => {
        event.preventDefault();
        setDropTarget(null);
      }}
      onDrop={handleRootDrop}
    >
      {nodes.length === 0 ? (
        <p className='text-muted-foreground mt-1 rounded-md border border-dashed px-2 py-3 text-center text-xs'>
          Drag elements from the library onto the screen or here.
        </p>
      ) : (
        nodes.map((node) => (
          <TreeRow
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            dropTarget={dropTarget}
            onSelect={onSelect}
            onDragTarget={setDropTarget}
            onDrop={handleDrop}
            onToggle={(id, expanded) => onChange(updateNode(nodes, id, { expanded }))}
            onAddChild={(id, type) => {
              const created = createNode(type);
              onChange(insertNode(nodes, id, created));
              onSelect(created.id);
            }}
            onDelete={(id) => {
              onChange(removeNode(nodes, id));
              if (selectedId && (selectedId === id || isDescendant(nodes, id, selectedId))) {
                onSelect(null);
              }
            }}
          />
        ))
      )}
    </div>
  );
}

interface TreeRowProps {
  node: UiNode;
  depth: number;
  selectedId: string | null;
  dropTarget: DropTarget | null;
  onSelect: (id: string) => void;
  onDragTarget: (target: DropTarget | null) => void;
  onDrop: (event: DragEvent, target: DropTarget) => void;
  onToggle: (id: string, expanded: boolean) => void;
  onAddChild: (id: string, type: NodeType) => void;
  onDelete: (id: string) => void;
}

const CHILD_TYPES: NodeType[] = ['section', 'text', 'button', 'field', 'data-display', 'list'];

function TreeRow(props: TreeRowProps) {
  const { node, depth, selectedId, dropTarget, onSelect, onDragTarget, onDrop } = props;
  const container = CONTAINER_TYPES.has(node.type);
  const expanded = node.expanded !== false;
  const NodeIcon = NODE_ICONS[node.type];
  const instance = isInstance(node);
  const zone = dropTarget?.id === node.id ? dropTarget.zone : null;

  return (
    <div>
      <div
        draggable
        onDragStart={(event) => {
          event.stopPropagation();
          event.dataTransfer.setData(TREE_DRAG_MIME, node.id);
          event.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => onDragTarget(null)}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const next = zoneFor(event, container);
          if (zone !== next) onDragTarget({ id: node.id, zone: next });
        }}
        onDrop={(event) => onDrop(event, { id: node.id, zone: zoneFor(event, container) })}
        {...pressProps(() => onSelect(node.id))}
        aria-pressed={selectedId === node.id}
        style={{ paddingLeft: depth * 12 }}
        className={cn(
          'group relative flex h-7 cursor-pointer items-center gap-1 rounded-md pr-1 text-[13px]',
          selectedId === node.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
          zone === 'inside' && 'ring-primary ring-2 ring-inset',
          zone === 'before' &&
            'before:bg-primary before:absolute before:inset-x-0 before:top-0 before:h-0.5',
          zone === 'after' &&
            'after:bg-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5'
        )}
      >
        {container && node.children.length > 0 ? (
          <button
            type='button'
            aria-label={expanded ? 'Collapse' : 'Expand'}
            className='text-muted-foreground hover:text-foreground flex size-5 shrink-0 items-center justify-center'
            onClick={(event) => {
              event.stopPropagation();
              props.onToggle(node.id, !expanded);
            }}
          >
            {expanded ? (
              <Icons.chevronDown className='size-3.5' />
            ) : (
              <Icons.chevronRight className='size-3.5' />
            )}
          </button>
        ) : (
          <span className='size-5 shrink-0' />
        )}
        <NodeIcon
          className={cn('size-3.5 shrink-0', !instance && 'text-muted-foreground')}
          style={instance ? { color: componentTone() } : undefined}
        />
        <span className='min-w-0 flex-1 truncate'>{node.label}</span>
        {instance ? (
          <Icons.component
            aria-label='Component instance'
            className='size-3 shrink-0'
            style={{ color: componentTone() }}
          />
        ) : null}
        {node.properties?.dependency === 'dependent' ? (
          <Icons.link className='text-primary size-3 shrink-0' />
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant='ghost'
                size='icon'
                className='size-6 shrink-0 opacity-0 group-hover:opacity-100 data-[popup-open]:opacity-100'
                aria-label={`${node.label} actions`}
                onClick={(event) => event.stopPropagation()}
              />
            }
          >
            <Icons.dots className='size-4' />
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-44'>
            {container
              ? CHILD_TYPES.map((type) => {
                  const ChildIcon = NODE_ICONS[type];
                  return (
                    <DropdownMenuItem key={type} onClick={() => props.onAddChild(node.id, type)}>
                      <ChildIcon className='size-4' /> Add {NODE_LABELS[type].toLowerCase()}
                    </DropdownMenuItem>
                  );
                })
              : null}
            {container ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem variant='destructive' onClick={() => props.onDelete(node.id)}>
              <Icons.trash className='size-4' /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {container && expanded
        ? node.children.map((child) => (
            <TreeRow key={child.id} {...props} node={child} depth={depth + 1} />
          ))
        : null}
    </div>
  );
}
