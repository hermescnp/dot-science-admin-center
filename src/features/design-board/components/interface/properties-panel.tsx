'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type {
  DesignLayer,
  InterfaceScreen,
  PageStyle,
  ScreenDevice,
  UiNode
} from '../../api/types';
import {
  componentTone,
  containsInstance,
  isInsideInstance,
  isInstance
} from '../../lib/components';
import { NODE_LABELS, updateNode, updateNodeProperties } from '../../lib/node-tree';
import { makeReusable } from '../../lib/use-components';
import { ComponentDetailsPanel, ComponentNotice } from './component-details-panel';
import { NodeEditor } from './node-editor';
import { NODE_ICONS } from './node-icons';
import { ChoiceRow, type ChoiceOption } from './property-controls';

type PropertiesTarget = { kind: 'screen' } | { kind: 'node'; node: UiNode };

interface PropertiesPanelProps {
  target: PropertiesTarget;
  layer: DesignLayer;
  screen: InterfaceScreen;
  /** Other screens of the section, as navigation targets. */
  screens: DesignLayer[];
  onScreenChange: (updates: Partial<InterfaceScreen>) => void;
  /** Offered in the screen's settings when given. */
  onRemoveScreen?: () => void;
  onClose: () => void;
  /**
   * How components show: `editor` (Edit layout) edits them like any element under a notice that
   * changes apply everywhere; `details` shows read-only description, parts and placement.
   */
  componentView?: 'editor' | 'details';
  /** Details view: opens Edit layout with the component instance selected. */
  onEditComponent?: (instanceId: string) => void;
  /** Editor view: leaves Edit layout. */
  onFinishEditing?: () => void;
  className?: string;
}

/** Properties of the selected element or of the screen itself, floating over the canvas. */
export function PropertiesPanel({
  target,
  layer,
  screen,
  screens,
  onScreenChange,
  onRemoveScreen,
  onClose,
  componentView = 'details',
  onEditComponent,
  onFinishEditing,
  className
}: PropertiesPanelProps) {
  const isScreen = target.kind === 'screen';
  const componentTarget =
    target.kind === 'node' &&
    (isInstance(target.node) || isInsideInstance(screen.nodes, target.node.id));
  const instance = target.kind === 'node' && isInstance(target.node);
  const HeaderIcon = isScreen
    ? screen.device === 'desktop'
      ? Icons.deviceDesktop
      : Icons.deviceMobile
    : NODE_ICONS[target.node.type];

  return (
    <aside
      aria-label='Properties'
      className={cn(
        'bg-popover/85 flex w-[min(18rem,calc(100%-1.5rem))] flex-col overflow-hidden rounded-xl border shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35),0_2px_6px_rgb(0_0_0/0.08)] backdrop-blur-md',
        className
      )}
    >
      <div
        className='flex shrink-0 items-center gap-2 border-b py-2 pr-2 pl-3'
        style={componentTarget ? { backgroundColor: componentTone(0.12) } : undefined}
      >
        <HeaderIcon
          className={cn('size-4 shrink-0', !componentTarget && 'text-primary')}
          style={componentTarget ? { color: componentTone() } : undefined}
        />
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-medium'>
            {isScreen ? layer.title : target.node.label}
          </p>
          <p
            className={cn(
              'text-[11px] tracking-wide uppercase',
              !componentTarget && 'text-muted-foreground'
            )}
            style={componentTarget ? { color: componentTone() } : undefined}
          >
            {isScreen
              ? 'Screen'
              : instance
                ? `Component · ${NODE_LABELS[target.node.type]}`
                : componentTarget
                  ? `Part · ${NODE_LABELS[target.node.type]}`
                  : NODE_LABELS[target.node.type]}
          </p>
        </div>
        {target.kind === 'node' && !isInsideInstance(screen.nodes, target.node.id) ? (
          <ComponentToggle node={target.node} screen={screen} onScreenChange={onScreenChange} />
        ) : null}
        <Button variant='ghost' size='icon' className='size-7' onClick={onClose}>
          <Icons.close className='size-4' />
          <span className='sr-only'>Close properties</span>
        </Button>
      </div>
      <div className='min-h-0 overflow-y-auto'>
        {target.kind === 'node' ? (
          componentTarget && componentView === 'details' ? (
            <ComponentDetailsPanel
              node={target.node}
              screen={screen}
              onScreenChange={onScreenChange}
              onEdit={onEditComponent}
            />
          ) : (
            <>
              {componentTarget ? (
                <ComponentNotice node={target.node} nodes={screen.nodes} onDone={onFinishEditing} />
              ) : null}
              <NodeEditor
                key={target.node.id}
                node={target.node}
                nodes={screen.nodes}
                screens={screens}
                onUpdate={(updates) =>
                  onScreenChange({ nodes: updateNode(screen.nodes, target.node.id, updates) })
                }
              />
            </>
          )
        ) : (
          <ScreenSettings screen={screen} onChange={onScreenChange} onRemove={onRemoveScreen} />
        )}
      </div>
    </aside>
  );
}

interface ComponentToggleProps {
  node: UiNode;
  screen: InterfaceScreen;
  onScreenChange: (updates: Partial<InterfaceScreen>) => void;
}

/** Makes the element a reusable component (linking it as the first instance), or detaches it. */
function ComponentToggle({ node, screen, onScreenChange }: ComponentToggleProps) {
  const [busy, setBusy] = useState(false);
  const latest = useRef({ screen, onScreenChange });
  useEffect(() => {
    latest.current = { screen, onScreenChange };
  });

  const instance = isInstance(node);
  const blocked = !instance && (isInsideInstance(screen.nodes, node.id) || containsInstance(node));
  const label = instance
    ? 'Detach instance'
    : blocked
      ? 'Components can’t be nested'
      : 'Make reusable';

  function link(componentId: string | undefined) {
    const { screen: current, onScreenChange: change } = latest.current;
    change({ nodes: updateNodeProperties(current.nodes, node.id, { componentId }) });
  }

  async function toggle() {
    if (busy || blocked) return;
    if (instance) {
      link(undefined);
      return;
    }
    setBusy(true);
    try {
      const component = await makeReusable(node);
      link(component.id);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const ToggleIcon = busy ? Icons.spinner : instance ? Icons.componentDetach : Icons.component;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type='button'
            aria-label={label}
            aria-disabled={blocked || busy}
            onClick={() => void toggle()}
            className={cn(
              'hover:bg-muted flex size-7 shrink-0 items-center justify-center rounded-md',
              (blocked || busy) && 'cursor-not-allowed opacity-50 hover:bg-transparent'
            )}
            style={instance ? { color: componentTone() } : undefined}
          />
        }
      >
        <ToggleIcon className={cn('size-4', busy && 'animate-spin')} />
      </TooltipTrigger>
      <TooltipContent side='bottom'>{label}</TooltipContent>
    </Tooltip>
  );
}

interface ScreenSettingsProps {
  screen: InterfaceScreen;
  onChange: (updates: Partial<InterfaceScreen>) => void;
  onRemove?: () => void;
}

const DEVICES: readonly ChoiceOption<ScreenDevice>[] = [
  { value: 'phone', label: 'Phone', icon: Icons.deviceMobile, text: 'Phone' },
  { value: 'desktop', label: 'Desktop', icon: Icons.deviceDesktop, text: 'Desktop' }
];

const PAGE_STYLES: readonly ChoiceOption<PageStyle>[] = [
  { value: 'screen', label: 'Full screen', icon: Icons.appWindow, text: 'Screen' },
  { value: 'panel', label: 'Panel sheet', icon: Icons.bottomSheet, text: 'Panel' }
];

function ScreenSettings({ screen, onChange, onRemove }: ScreenSettingsProps) {
  return (
    <div className='space-y-4 p-3'>
      <ChoiceRow
        label='Device'
        value={screen.device}
        options={DEVICES}
        onChange={(device) => onChange({ device })}
      />
      <ChoiceRow
        label='Page style'
        value={screen.pageStyle}
        options={PAGE_STYLES}
        onChange={(pageStyle) => onChange({ pageStyle })}
      />
      {onRemove ? (
        <Button variant='outline' size='sm' className='text-destructive w-full' onClick={onRemove}>
          <Icons.trash className='size-4' /> Remove screen
        </Button>
      ) : null}
    </div>
  );
}
