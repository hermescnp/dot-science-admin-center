'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { architectureNodes } from '../data/architecture-graph';
import { modelsForNode } from '../data/openrouter-models';
import { servicePlans } from '../data/service-plans';
import { BrandLogo } from './brand-logo';
import { ModelPricingTable } from './model-pricing-table';

const nodesById = new Map(architectureNodes.map((node) => [node.id, node]));

interface ModelPricingDialogProps {
  nodeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenGateway: () => void;
}

/** For model providers we only reach through OpenRouter, so they have no plans of their own. */
export function ModelPricingDialog({
  nodeId,
  open,
  onOpenChange,
  onOpenGateway
}: ModelPricingDialogProps) {
  const node = nodeId ? nodesById.get(nodeId) : undefined;
  const models = nodeId && !servicePlans[nodeId] ? modelsForNode(nodeId) : [];
  const visible = Boolean(node && models.length);

  return (
    <Dialog open={open && visible} onOpenChange={onOpenChange}>
      {node && visible ? (
        <DialogContent className='flex max-h-[90vh] w-[95vw] max-w-[1200px] flex-col gap-4 p-5 sm:max-w-[1200px]'>
          <DialogHeader className='flex-row items-center gap-3 pr-10'>
            {node.data.logo ? (
              <BrandLogo logo={node.data.logo} logoDark={node.data.logoDark} size={40} />
            ) : null}
            <div className='min-w-0 flex-1'>
              <DialogTitle className='text-base'>{node.data.label}</DialogTitle>
              <DialogDescription className='text-xs'>{node.data.description}</DialogDescription>
            </div>
          </DialogHeader>
          <div className='bg-muted/60 text-muted-foreground flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs leading-snug'>
            <span>
              Billed through OpenRouter credits. There is no direct {node.data.label} account or
              plan.
            </span>
            <Button size='sm' variant='outline' className='h-7 shrink-0' onClick={onOpenGateway}>
              OpenRouter plans
            </Button>
          </div>
          <div className='-mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1 py-1'>
            <ModelPricingTable models={models} enabled={open} />
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
