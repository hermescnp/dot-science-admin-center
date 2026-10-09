import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { BrandLogo } from '@/features/architecture/components/brand-logo';
import { serviceNodesById } from '@/features/platform-features/constants/options';
import { cn } from '@/lib/utils';
import { formatCount, formatMetric, planName } from '../projection/format';
import { metricInfo } from '../projection/plan-quotas';
import type { ProjectionDrivers, StackLimit, StackProjection } from '../projection/projection';

export function ServiceLabel({ serviceId }: { serviceId: string }) {
  const node = serviceNodesById.get(serviceId);
  return (
    <div className='flex items-center gap-2'>
      {node?.data.logo ? (
        <BrandLogo logo={node.data.logo} logoDark={node.data.logoDark} size={24} />
      ) : null}
      <span className='font-medium'>{node?.data.label ?? serviceId}</span>
    </div>
  );
}

function LimitCard({
  title,
  limit,
  mau,
  empty
}: {
  title: string;
  limit: StackLimit | null;
  mau: number;
  empty: string;
}) {
  const used = limit ? mau / limit.metric.maxMau : 0;
  return (
    <div className='bg-muted/40 rounded-lg border p-4'>
      <p className='text-muted-foreground text-xs font-medium'>{title}</p>
      {limit ? (
        <>
          <p className='mt-1 text-2xl font-semibold tabular-nums'>
            {formatCount(limit.metric.maxMau)}{' '}
            <span className='text-muted-foreground text-sm font-normal'>monthly active users</span>
          </p>
          <p className='text-muted-foreground mt-1 text-xs'>
            {serviceNodesById.get(limit.serviceId)?.data.label ?? limit.serviceId} runs out first on{' '}
            {metricInfo[limit.metric.metric].label.toLowerCase()}. At {formatCount(mau)} MAU you are
            using{' '}
            <span className={cn('font-medium', used > 1 ? 'text-destructive' : 'text-foreground')}>
              {Math.round(used * 100)}%
            </span>{' '}
            of it.
          </p>
        </>
      ) : (
        <p className='text-muted-foreground mt-1 text-sm'>{empty}</p>
      )}
    </div>
  );
}

interface ProjectionCapacityProps {
  projection: StackProjection;
  drivers: ProjectionDrivers;
}

export function ProjectionCapacity({ projection, drivers }: ProjectionCapacityProps) {
  const { includedLimit, hardLimit } = projection;
  const rows = projection.rows.flatMap((row) =>
    (row.capacity?.metrics ?? []).map((metric) => ({ row, metric }))
  );

  return (
    <div className='flex flex-col gap-4'>
      <div className='grid gap-3 md:grid-cols-2'>
        <LimitCard
          title='Covered by current plans (before overage)'
          limit={includedLimit}
          mau={drivers.mau}
          empty='No included quota limits the current plans.'
        />
        <LimitCard
          title='Hard limit (a plan stops serving)'
          limit={hardLimit}
          mau={drivers.mau}
          empty='Every current plan bills overage instead of stopping.'
        />
      </div>
      <p className='text-muted-foreground text-xs'>
        Per-user usage comes from the Playground drivers. Pay-per-use services have no quota and are
        not listed.
      </p>
      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='px-4'>Service</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Metric</TableHead>
              <TableHead className='text-right'>Included</TableHead>
              <TableHead className='text-right'>Per user</TableHead>
              <TableHead className='text-right'>Max MAU</TableHead>
              <TableHead>Beyond the quota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ row, metric }) => {
              const isStackLimit =
                includedLimit?.serviceId === row.service.id &&
                includedLimit.metric.metric === metric.metric;
              const isServiceLimit = row.capacity?.bottleneck?.metric === metric.metric;
              return (
                <TableRow
                  key={`${row.service.id}-${metric.metric}`}
                  className={cn(isStackLimit && 'bg-amber-500/10 hover:bg-amber-500/15')}
                >
                  <TableCell className='px-4'>
                    <ServiceLabel serviceId={row.service.id} />
                  </TableCell>
                  <TableCell>{planName(row.service.id, row.current.planId)}</TableCell>
                  <TableCell>{metricInfo[metric.metric].label}</TableCell>
                  <TableCell className='text-right tabular-nums'>
                    {formatMetric(metric.metric, metric.included)}
                  </TableCell>
                  <TableCell className='text-muted-foreground text-right tabular-nums'>
                    {formatMetric(metric.metric, metric.perUser)}
                  </TableCell>
                  <TableCell
                    className={cn('text-right tabular-nums', isServiceLimit && 'font-semibold')}
                  >
                    {formatCount(metric.maxMau)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant='outline'
                      className={cn(
                        'h-5 px-1.5 text-[11px]',
                        metric.hardCap && 'border-destructive/40 text-destructive'
                      )}
                    >
                      {metric.hardCap ? 'Stops' : 'Billed as overage'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
