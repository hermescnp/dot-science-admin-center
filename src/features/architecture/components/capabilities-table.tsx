'use client';

import { Fragment } from 'react';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import type { ServicePlanStatus } from '../api/types';
import type { ServiceCapability } from '../data/service-plans';
import { NotApplicable } from './not-applicable';

interface CapabilitiesTableProps {
  capabilities: ServiceCapability[];
  currentPlanId: string | undefined;
  currentPlanName: string | undefined;
  detected: boolean;
  status: ServicePlanStatus | undefined;
  usagePending: boolean;
  usageFailed: boolean;
}

export function CapabilitiesTable({
  capabilities,
  currentPlanId,
  currentPlanName,
  detected,
  status,
  usagePending,
  usageFailed
}: CapabilitiesTableProps) {
  const groups = new Map<string, ServiceCapability[]>();
  for (const capability of capabilities) {
    groups.set(capability.group, [...(groups.get(capability.group) ?? []), capability]);
  }
  const usageReason = usageFailed
    ? 'Usage could not be loaded'
    : (status?.usageError ?? 'Not exposed by the provider API');

  return (
    <div className='border-border shrink-0 overflow-hidden rounded-xl border'>
      <Table className='text-xs'>
        <TableHeader>
          <TableRow className='bg-muted/40 hover:bg-muted/40'>
            <TableHead className='w-[34%]'>Capability</TableHead>
            <TableHead className='w-[22%]'>Provider max</TableHead>
            <TableHead className='w-[22%]'>
              <span className='flex items-center gap-1.5'>
                {currentPlanName ?? 'Current plan'}
                <Badge variant='secondary' className='h-4 px-1.5 text-[10px]'>
                  {detected ? 'Detected' : 'Configured'}
                </Badge>
              </span>
            </TableHead>
            <TableHead className='w-[22%]'>Used</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...groups].map(([group, rows]) => (
            <Fragment key={group}>
              <TableRow className='hover:bg-transparent'>
                <TableCell
                  colSpan={4}
                  className='text-muted-foreground bg-muted/20 py-1.5 text-[11px] font-medium tracking-wide uppercase'
                >
                  {group}
                </TableCell>
              </TableRow>
              {rows.map((capability) => {
                const planValue = currentPlanId ? capability.plans[currentPlanId] : undefined;
                const used = status?.usage?.[capability.id];
                return (
                  <TableRow key={capability.id}>
                    <TableCell className='font-medium whitespace-normal'>
                      {capability.label}
                    </TableCell>
                    <TableCell className='whitespace-normal'>{capability.providerMax}</TableCell>
                    <TableCell className='whitespace-normal'>
                      {planValue ?? <NotApplicable reason='Not included in this plan' />}
                    </TableCell>
                    <TableCell className='whitespace-normal'>
                      {usagePending ? (
                        <Icons.spinner className='text-muted-foreground size-3.5 animate-spin' />
                      ) : (
                        (used ?? <NotApplicable reason={usageReason} />)
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
