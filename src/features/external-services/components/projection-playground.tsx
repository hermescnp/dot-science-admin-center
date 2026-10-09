import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatUsd } from '../constants/billing';
import { formatMetric, planName } from '../projection/format';
import { metricInfo } from '../projection/plan-quotas';
import {
  assumptions,
  defaultDrivers,
  type MetricEvaluation,
  type ProjectionDrivers,
  type ServiceProjection,
  type StackProjection
} from '../projection/projection';
import { ServiceLabel } from './projection-capacity';

interface DriverControl {
  key: keyof ProjectionDrivers;
  label: string;
  max: number;
  step: number;
}

const driverControls: DriverControl[] = [
  { key: 'mau', label: 'Monthly active users', max: 200_000, step: 100 },
  { key: 'sessionsPerUser', label: 'Sessions per user per month', max: 60, step: 1 },
  {
    key: 'voiceMinutesPerSession',
    label: 'IAteneo voice minutes per session',
    max: 30,
    step: 0.5
  },
  {
    key: 'interviewMinutesPerUser',
    label: 'Resonance interview minutes per user',
    max: 30,
    step: 0.05
  },
  { key: 'aiCallsPerSession', label: 'AI calls per session', max: 50, step: 1 },
  { key: 'emailsPerUser', label: 'Emails per user per month', max: 30, step: 1 },
  { key: 'storageMbPerUser', label: 'File storage per user (MB)', max: 1_000, step: 5 },
  { key: 'databaseKbPerUser', label: 'Database per user (KB)', max: 5_000, step: 50 },
  { key: 'egressMbPerSession', label: 'Egress per session (MB)', max: 100, step: 1 },
  { key: 'errorsPer1kSessions', label: 'Errors per 1,000 sessions', max: 200, step: 1 },
  { key: 'pageViewsPerSession', label: 'Page views per session', max: 50, step: 1 }
];

function DriverField({
  control,
  value,
  onChange
}: {
  control: DriverControl;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = `driver-${control.key}`;
  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between gap-2'>
        <Label htmlFor={id} className='text-xs'>
          {control.label}
        </Label>
        <Input
          id={id}
          type='number'
          min={0}
          step={control.step}
          value={value}
          onChange={(event) => {
            const next = event.target.valueAsNumber;
            onChange(Number.isFinite(next) && next >= 0 ? next : 0);
          }}
          className='h-7 w-24 text-right tabular-nums'
        />
      </div>
      <Slider
        min={0}
        max={Math.max(control.max, value)}
        step={control.step}
        value={value}
        onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : (next as number))}
        aria-label={control.label}
      />
    </div>
  );
}

function UsageBar({ metric }: { metric: MetricEvaluation }) {
  const unlimited = metric.included === Infinity;
  const tone =
    metric.ratio > 1 ? 'bg-destructive' : metric.ratio >= 0.8 ? 'bg-amber-500' : 'bg-primary';
  return (
    <div className='flex flex-col gap-1'>
      <div className='flex items-baseline justify-between gap-3 text-xs'>
        <span className='text-muted-foreground'>{metricInfo[metric.metric].label}</span>
        <span className='tabular-nums'>
          {formatMetric(metric.metric, metric.usage)}
          {unlimited ? null : (
            <span className='text-muted-foreground'>
              {' '}
              / {formatMetric(metric.metric, metric.included)}
            </span>
          )}
        </span>
      </div>
      {unlimited ? null : (
        <div className='bg-muted h-1 overflow-hidden rounded-full'>
          <div
            className={cn('h-full rounded-full transition-all', tone)}
            style={{ width: `${Math.min(metric.ratio, 1) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

function PlanCost({ row, side }: { row: ServiceProjection; side: 'current' | 'suggested' }) {
  const evaluation = row[side];
  const overage = evaluation.monthlyCost - evaluation.baseMonthly;
  return (
    <div className='flex flex-col items-end gap-0.5'>
      <span className='font-medium'>{planName(row.service.id, evaluation.planId)}</span>
      <span className='tabular-nums'>{formatUsd(evaluation.monthlyCost)}/mo</span>
      {evaluation.planId && overage > 0 ? (
        <span className='text-muted-foreground text-[11px] tabular-nums'>
          incl. {formatUsd(overage)} overage
        </span>
      ) : null}
      {evaluation.overCap ? (
        <Badge variant='destructive' className='h-5 px-1.5 text-[11px]'>
          Over limit
        </Badge>
      ) : null}
    </div>
  );
}

function Summary({ projection }: { projection: StackProjection }) {
  const { currentMonthly, suggestedMonthly } = projection;
  const difference = suggestedMonthly - currentMonthly;
  const cells = [
    { label: 'Current plans', monthly: currentMonthly },
    { label: 'Suggested plans', monthly: suggestedMonthly }
  ];
  return (
    <div className='bg-muted sticky bottom-0 z-10 grid grid-cols-3 gap-4 rounded-lg border p-3'>
      {cells.map((cell) => (
        <div key={cell.label}>
          <p className='text-muted-foreground text-xs'>{cell.label}</p>
          <p className='font-semibold tabular-nums'>{formatUsd(cell.monthly)}/mo</p>
          <p className='text-muted-foreground text-xs tabular-nums'>
            {formatUsd(cell.monthly * 12)}/yr
          </p>
        </div>
      ))}
      <div>
        <p className='text-muted-foreground text-xs'>Difference</p>
        <p
          className={cn(
            'font-semibold tabular-nums',
            difference < 0 && 'text-emerald-600 dark:text-emerald-400',
            difference > 0 && 'text-destructive'
          )}
        >
          {difference > 0 ? '+' : ''}
          {formatUsd(difference)}/mo
        </p>
        <p className='text-muted-foreground text-xs'>
          Includes {formatUsd(projection.fixedMonthly)}/mo of fixed subscriptions
        </p>
      </div>
    </div>
  );
}

interface ProjectionPlaygroundProps {
  projection: StackProjection;
  drivers: ProjectionDrivers;
  onDriversChange: (drivers: ProjectionDrivers) => void;
}

export function ProjectionPlayground({
  projection,
  drivers,
  onDriversChange
}: ProjectionPlaygroundProps) {
  return (
    <div className='grid gap-4 lg:grid-cols-[280px_1fr]'>
      <div className='flex flex-col gap-4'>
        <div className='flex items-center justify-between'>
          <p className='text-sm font-semibold'>Drivers</p>
          <Button variant='ghost' size='sm' onClick={() => onDriversChange(defaultDrivers)}>
            <Icons.refresh className='mr-1 h-3.5 w-3.5' />
            Reset
          </Button>
        </div>
        {driverControls.map((control) => (
          <DriverField
            key={control.key}
            control={control}
            value={drivers[control.key]}
            onChange={(value) => onDriversChange({ ...drivers, [control.key]: value })}
          />
        ))}
        <p className='text-muted-foreground text-[11px] leading-relaxed'>
          Assumes {assumptions.pageWeightMb} MB and {assumptions.requestsPerPageView} requests per
          page view, {assumptions.webrtcParticipantsPerVoiceMinute} WebRTC participants per voice
          minute and {assumptions.speechCreditsPerInterviewMinute} ElevenLabs credits per interview
          minute. LLM calls are priced on OpenRouter.
        </p>
      </div>
      <div className='flex min-w-0 flex-col gap-3'>
        <div className='rounded-lg border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='px-4'>Service</TableHead>
                <TableHead>Projected usage</TableHead>
                <TableHead className='text-right'>Current plan</TableHead>
                <TableHead className='text-right'>Cheapest fit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projection.rows.map((row) => {
                const changes = row.suggested.planId !== row.current.planId;
                return (
                  <TableRow key={row.service.id} className='align-top'>
                    <TableCell className='px-4'>
                      <ServiceLabel serviceId={row.service.id} />
                    </TableCell>
                    <TableCell className='min-w-64'>
                      <div className='flex flex-col gap-2'>
                        {row.current.metrics.map((metric) => (
                          <UsageBar key={metric.metric} metric={metric} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className='text-right'>
                      <PlanCost row={row} side='current' />
                    </TableCell>
                    <TableCell className='text-right'>
                      {changes ? (
                        <PlanCost row={row} side='suggested' />
                      ) : (
                        <span className='text-muted-foreground text-xs'>Keep current</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <Summary projection={projection} />
      </div>
    </div>
  );
}
